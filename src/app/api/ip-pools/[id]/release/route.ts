import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/ip-pools/[id]/release - Release an IP assignment by username
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { username } = body

    if (!username || !username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Verify pool exists
    const pool = await db.ipPool.findUnique({
      where: { id },
    })
    if (!pool) {
      return NextResponse.json({ error: 'IP pool not found' }, { status: 404 })
    }

    // Find assignment for this username in this pool
    const assignment = await db.ipAssignment.findFirst({
      where: {
        poolId: id,
        username: username.trim(),
        status: 'assigned',
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: `No active assignment found for user '${username}' in this pool` },
        { status: 404 }
      )
    }

    // Release the IP
    const updated = await db.ipAssignment.update({
      where: { id: assignment.id },
      data: {
        status: 'available',
        username: null,
        macAddress: null,
        hostname: null,
        assignedAt: null,
        releasedAt: new Date(),
      },
    })

    // Make sure the range is marked as available if it was exhausted
    await db.ipPoolRange.update({
      where: { id: assignment.rangeId },
      data: { isAvailable: true },
    })

    // If pool was full, set back to active
    if (pool.status === 'full') {
      await db.ipPool.update({
        where: { id },
        data: { status: 'active' },
      })
    }

    // Clear user's pool reference if this was their pool assignment
    await db.radUser.update({
      where: { username: username.trim() },
      data: {
        ipPoolId: null,
        ipType: 'dynamic',
      },
    }).catch(() => {
      // User may not exist, ignore
    })

    return NextResponse.json({
      message: `IP ${assignment.ipAddress} released from user '${username}'`,
      releasedIp: assignment.ipAddress,
      releasedAt: updated.releasedAt,
    })
  } catch (error) {
    console.error('Error releasing IP:', error)
    return NextResponse.json({ error: 'Failed to release IP' }, { status: 500 })
  }
}
