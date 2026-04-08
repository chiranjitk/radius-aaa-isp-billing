import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/sessions/batch — Batch operations on sessions
// Body: { action: "disconnect", sessionIds: string[] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sessionIds } = body as {
      action: 'disconnect'
      sessionIds: string[]
    }

    if (!action || action !== 'disconnect') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "disconnect".' },
        { status: 400 }
      )
    }

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: 'sessionIds must be a non-empty array.' },
        { status: 400 }
      )
    }

    if (sessionIds.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 sessions per batch operation.' },
        { status: 400 }
      )
    }

    // Find all sessions by their sessionId (unique field)
    const sessions = await db.radAcct.findMany({
      where: { sessionId: { in: sessionIds } },
    })

    if (sessions.length !== sessionIds.length) {
      const foundIds = new Set(sessions.map((s) => s.sessionId))
      const missingCount = sessionIds.filter((id) => !foundIds.has(id)).length
      return NextResponse.json(
        { error: `${missingCount} session(s) not found.` },
        { status: 404 }
      )
    }

    const errors: string[] = []
    const now = new Date()

    // Filter out already stopped sessions and disconnect the rest
    const activeSessions = sessions.filter((s) => s.status !== 'stopped')

    if (activeSessions.length === 0) {
      return NextResponse.json({
        success: true,
        affected: 0,
        errors: ['All selected sessions are already stopped.'],
      })
    }

    // Count already-stopped sessions
    if (sessions.length > activeSessions.length) {
      const skippedCount = sessions.length - activeSessions.length
      errors.push(`${skippedCount} session(s) were already stopped and skipped.`)
    }

    const result = await db.$transaction(async (tx) => {
      return tx.radAcct.updateMany({
        where: {
          id: { in: activeSessions.map((s) => s.id) },
          status: 'active',
        },
        data: {
          status: 'stopped',
          acctStopTime: now,
          terminateCause: 'Admin-Reset',
          updateCount: { increment: 1 },
        },
      })
    })

    return NextResponse.json({
      success: true,
      affected: result.count,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in batch session operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform batch session operation' },
      { status: 500 }
    )
  }
}
