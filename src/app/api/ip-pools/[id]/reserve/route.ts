import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/ip-pools/[id]/reserve - Reserve a specific IP in pool
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
        status: 'available',
      },
    })

    if (!assignment) {
      return NextResponse.json(
        { error: `IP '${ipAddress}' is not available in this pool` },
        { status: 404 }
      )
    }

    // Reserve the IP
    const updated = await db.ipAssignment.update({
      where: { id: assignment.id },
      data: {
        status: 'reserved',
        assignedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: `IP ${assignment.ipAddress} reserved successfully`,
      assignment: {
        id: updated.id,
        ipAddress: updated.ipAddress,
        status: updated.status,
      },
    })
  } catch (error) {
    console.error('Error reserving IP:', error)
    return NextResponse.json({ error: 'Failed to reserve IP' }, { status: 500 })
  }
}
