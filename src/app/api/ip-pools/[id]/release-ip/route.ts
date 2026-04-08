import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/ip-pools/[id]/release-ip - Release a specific IP by IP address
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { ipAddress } = body

    if (!ipAddress || !ipAddress.trim()) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 })
    }

    // Verify pool exists
    const pool = await db.ipPool.findUnique({
      where: { id },
    })
    if (!pool) {
      return NextResponse.json({ error: 'IP pool not found' }, { status: 404 })
    }

    // Find the IP assignment in this pool
    const assignment = await db.ipAssignment.findFirst({
      where: {
        poolId: id,
        ipAddress: ipAddress.trim(),
        status: { in: ['assigned', 'reserved', 'quarantined'] },
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: `IP '${ipAddress}' is not assigned or reserved in this pool` },
        { status: 404 }
      )
    }

    const previousUsername = assignment.username

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

    // Make sure the range is marked as available
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

    // Clear user's pool reference if this was their assignment
    if (previousUsername) {
      await db.radUser.update({
        where: { username: previousUsername },
        data: {
          ipPoolId: null,
          ipType: 'dynamic',
        },
      }).catch(() => {
        // User may not exist, ignore
      })
    }

    return NextResponse.json({
      message: `IP ${assignment.ipAddress} released successfully`,
      releasedIp: assignment.ipAddress,
    })
  } catch (error) {
    console.error('Error releasing IP:', error)
    return NextResponse.json({ error: 'Failed to release IP' }, { status: 500 })
  }
}
