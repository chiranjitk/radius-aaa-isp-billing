import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/sessions - List sessions with filters, search, and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const nasIp = searchParams.get('nasIp') || ''
    const username = searchParams.get('username') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const where: Prisma.RadAcctWhereInput = {}

    // Search by username or sessionId
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { sessionId: { contains: search } },
        { acctSessionId: { contains: search } },
      ]
    } else {
      // Individual filters take precedence when no global search
      if (username) {
        where.username = { contains: username }
      }
    }

    // Status filter
    if (status && ['active', 'stopped'].includes(status)) {
      where.status = status
    }

    // NAS filter
    if (nasIp) {
      where.nasIpAddress = nasIp
    }

    // Date range filter
    if (startDate || endDate) {
      where.acctStartTime = {}
      if (startDate) {
        where.acctStartTime.gte = new Date(startDate)
      }
      if (endDate) {
        // Include the entire end day
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.acctStartTime.lte = end
      }
    }

    const [sessions, total] = await Promise.all([
      db.radAcct.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true,
              company: true,
              status: true,
            },
          },
          nas: {
            select: {
              id: true,
              nasName: true,
              shortName: true,
              ipAddress: true,
              nasType: true,
              status: true,
              vendor: true,
              model: true,
            },
          },
        },
        orderBy: { acctStartTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.radAcct.count({ where }),
    ])

    // Calculate live stats
    const [activeCount, todayCount, todayActiveSessions, allActiveSessions] = await Promise.all([
      db.radAcct.count({ where: { status: 'active' } }),
      db.radAcct.count({
        where: {
          acctStartTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      db.radAcct.findMany({
        where: {
          acctStartTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        select: {
          acctSessionTime: true,
          acctInputOctets: true,
          acctOutputOctets: true,
          acctInputGigawords: true,
          acctOutputGigawords: true,
        },
      }),
      db.radAcct.findMany({
        where: { status: 'active' },
        select: {
          acctInputOctets: true,
          acctOutputOctets: true,
          acctInputGigawords: true,
          acctOutputGigawords: true,
        },
      }),
    ])

    // Calculate average duration for today's sessions
    let avgDuration = 0
    if (todayActiveSessions.length > 0) {
      const totalDuration = todayActiveSessions.reduce((sum, s) => sum + (s.acctSessionTime || 0), 0)
      avgDuration = Math.round(totalDuration / todayActiveSessions.length)
    }

    // Calculate total bandwidth (active sessions)
    let totalBandwidth = 0
    for (const s of allActiveSessions) {
      const inputGigawords = Number(s.acctInputGigawords || 0)
      const outputGigawords = Number(s.acctOutputGigawords || 0)
      totalBandwidth += Number(s.acctInputOctets || 0) + (inputGigawords * 4294967296) +
                        Number(s.acctOutputOctets || 0) + (outputGigawords * 4294967296)
    }

    // Enhance sessions with calculated duration
    const enhancedSessions = sessions.map((session) => {
      let duration = session.acctSessionTime || 0
      // If session is active and no session time, calculate from start time
      if (session.status === 'active' && !session.acctSessionTime && session.acctStartTime) {
        duration = Math.floor((Date.now() - session.acctStartTime.getTime()) / 1000)
      }
      return {
        ...session,
        calculatedDuration: duration,
        acctInputOctets: Number(session.acctInputOctets || 0),
        acctOutputOctets: Number(session.acctOutputOctets || 0),
        acctInputPackets: Number(session.acctInputPackets || 0),
        acctOutputPackets: Number(session.acctOutputPackets || 0),
        acctInputGigawords: Number(session.acctInputGigawords || 0),
        acctOutputGigawords: Number(session.acctOutputGigawords || 0),
      }
    })

    return NextResponse.json({
      sessions: enhancedSessions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        activeCount,
        todayCount,
        avgDuration,
        totalBandwidth,
      },
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create a test/demo session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, nasIpAddress, sessionId } = body

    // Check if session ID already exists
    if (sessionId) {
      const existing = await db.radAcct.findUnique({ where: { sessionId } })
      if (existing) {
        return NextResponse.json(
          { error: 'Session ID already exists' },
          { status: 409 }
        )
      }
    }

    // Verify user exists if username provided
    if (username) {
      const user = await db.radUser.findUnique({ where: { username } })
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
    }

    const newSessionId = sessionId || `sess-demo-${Date.now()}`

    const session = await db.radAcct.create({
      data: {
        sessionId: newSessionId,
        username: username || null,
        nasIpAddress: nasIpAddress || null,
        acctStartTime: new Date(),
        acctStopTime: null,
        acctSessionTime: 0,
        acctAuthentic: 'RADIUS',
        acctInputOctets: 0,
        acctOutputOctets: 0,
        acctInputPackets: 0,
        acctOutputPackets: 0,
        acctInputGigawords: 0,
        acctOutputGigawords: 0,
        status: 'active',
        terminateCause: null,
        updateCount: 0,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
          },
        },
        nas: {
          select: {
            id: true,
            nasName: true,
            ipAddress: true,
            nasType: true,
          },
        },
      },
    })

    return NextResponse.json({
      session: {
        ...session,
        acctInputOctets: Number(session.acctInputOctets || 0),
        acctOutputOctets: Number(session.acctOutputOctets || 0),
        acctInputPackets: Number(session.acctInputPackets || 0),
        acctOutputPackets: Number(session.acctOutputPackets || 0),
        acctInputGigawords: Number(session.acctInputGigawords || 0),
        acctOutputGigawords: Number(session.acctOutputGigawords || 0),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions - Disconnect a session (mark as stopped)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, terminateCause } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const session = await db.radAcct.findUnique({ where: { sessionId } })

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (session.status === 'stopped') {
      return NextResponse.json(
        { error: 'Session is already stopped' },
        { status: 400 }
      )
    }

    const now = new Date()
    const sessionTime = session.acctSessionTime || Math.floor((now.getTime() - session.acctStartTime.getTime()) / 1000)

    const updated = await db.radAcct.update({
      where: { sessionId },
      data: {
        status: 'stopped',
        acctStopTime: now,
        acctSessionTime: sessionTime,
        terminateCause: terminateCause || 'Admin-Reset',
        updateCount: { increment: 1 },
      },
    })

    return NextResponse.json({
      message: 'Session disconnected successfully',
      session: {
        ...updated,
        acctInputOctets: Number(updated.acctInputOctets || 0),
        acctOutputOctets: Number(updated.acctOutputOctets || 0),
        acctInputPackets: Number(updated.acctInputPackets || 0),
        acctOutputPackets: Number(updated.acctOutputPackets || 0),
        acctInputGigawords: Number(updated.acctInputGigawords || 0),
        acctOutputGigawords: Number(updated.acctOutputGigawords || 0),
      },
    })
  } catch (error) {
    console.error('Error disconnecting session:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect session' },
      { status: 500 }
    )
  }
}
