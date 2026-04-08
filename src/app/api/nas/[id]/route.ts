import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/nas/[id] - Get a single NAS device with details and active session count
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const nas = await db.nas.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            acctRecords: {
              where: { status: 'active' },
            },
          },
        },
        acctRecords: {
          where: { status: 'active' },
          take: 10,
          orderBy: { acctStartTime: 'desc' },
          select: {
            sessionId: true,
            username: true,
            framedIpAddress: true,
            acctStartTime: true,
            connectInfo: true,
            calledStationId: true,
            callingStationId: true,
          },
        },
      },
    })

    if (!nas) {
      return NextResponse.json(
        { error: 'NAS device not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      device: {
        ...nas,
        activeSessions: nas._count.acctRecords,
        recentSessions: nas.acctRecords,
      },
    })
  } catch (error) {
    console.error('Error fetching NAS device:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NAS device' },
      { status: 500 }
    )
  }
}

// PUT /api/nas/[id] - Update a NAS device
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.nas.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'NAS device not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      nasName,
      shortName,
      nasType,
      ipAddress,
      ports,
      secret,
      server,
      community,
      description,
      status,
      vendor,
      model,
      location,
      contact,
    } = body

    // Validate required fields
    if (nasName !== undefined && !nasName.trim()) {
      return NextResponse.json(
        { error: 'NAS name cannot be empty' },
        { status: 400 }
      )
    }

    if (ipAddress !== undefined) {
      if (!ipAddress.trim()) {
        return NextResponse.json(
          { error: 'IP address cannot be empty' },
          { status: 400 }
        )
      }
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
      if (!ipRegex.test(ipAddress.trim())) {
        return NextResponse.json(
          { error: 'Invalid IP address format' },
          { status: 400 }
        )
      }

      // Check for duplicate IP (excluding current device)
      if (ipAddress.trim() !== existing.ipAddress) {
        const duplicate = await db.nas.findUnique({
          where: { ipAddress: ipAddress.trim() },
        })
        if (duplicate) {
          return NextResponse.json(
            { error: 'A NAS device with this IP address already exists' },
            { status: 409 }
          )
        }
      }
    }

    if (secret !== undefined && !secret.trim()) {
      return NextResponse.json(
        { error: 'RADIUS secret cannot be empty' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (nasName !== undefined) updateData.nasName = nasName.trim()
    if (shortName !== undefined) updateData.shortName = shortName?.trim() || null
    if (nasType !== undefined) updateData.nasType = nasType
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress.trim()
    if (ports !== undefined) updateData.ports = ports ? parseInt(ports) : 0
    if (secret !== undefined) updateData.secret = secret.trim()
    if (server !== undefined) updateData.server = server?.trim() || null
    if (community !== undefined) updateData.community = community?.trim() || null
    if (description !== undefined) updateData.description = description?.trim() || null
    if (status !== undefined) updateData.status = status
    if (vendor !== undefined) updateData.vendor = vendor?.trim() || null
    if (model !== undefined) updateData.model = model?.trim() || null
    if (location !== undefined) updateData.location = location?.trim() || null
    if (contact !== undefined) updateData.contact = contact?.trim() || null

    const updated = await db.nas.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ device: updated })
  } catch (error) {
    console.error('Error updating NAS device:', error)
    return NextResponse.json(
      { error: 'Failed to update NAS device' },
      { status: 500 }
    )
  }
}

// DELETE /api/nas/[id] - Delete a NAS device
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.nas.findUnique({
      where: { id },
      include: {
        _count: {
          select: { acctRecords: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'NAS device not found' },
        { status: 404 }
      )
    }

    // Check for active sessions before deleting
    if (existing._count.acctRecords > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete NAS device with associated accounting records. Please stop all active sessions first.',
          activeRecords: existing._count.acctRecords,
        },
        { status: 409 }
      )
    }

    await db.nas.delete({ where: { id } })

    return NextResponse.json({
      message: 'NAS device deleted successfully',
      deviceId: id,
    })
  } catch (error) {
    console.error('Error deleting NAS device:', error)
    return NextResponse.json(
      { error: 'Failed to delete NAS device' },
      { status: 500 }
    )
  }
}
