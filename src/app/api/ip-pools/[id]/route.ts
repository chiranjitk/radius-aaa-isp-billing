import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper: Convert IP to integer
function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

// Helper: Validate IP
function isValidIp(ip: string): boolean {
  const regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = ip.match(regex)
  if (!match) return false
  return match.slice(1).every((o) => { const n = parseInt(o, 10); return n >= 0 && n <= 255 })
}

// GET /api/ip-pools/[id] - Get single pool with ranges and assignments
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const pool = await db.ipPool.findUnique({
      where: { id },
      include: {
        ranges: {
          orderBy: { startIp: 'asc' },
        },
        assignments: {
          orderBy: { ipAddress: 'asc' },
        },
        users: {
          select: { id: true, username: true, fullName: true, status: true },
        },
      },
    })

    if (!pool) {
      return NextResponse.json({ error: 'IP pool not found' }, { status: 404 })
    }

    // Calculate stats per range
    const enrichedRanges = await Promise.all(
      pool.ranges.map(async (range) => {
        const assignments = await db.ipAssignment.findMany({
          where: { rangeId: range.id },
        })
        const total = ipToLong(range.endIp) - ipToLong(range.startIp) + 1
        const available = assignments.filter((a) => a.status === 'available').length
        const assigned = assignments.filter((a) => a.status === 'assigned').length
        const reserved = assignments.filter((a) => a.status === 'reserved').length
        const quarantined = assignments.filter((a) => a.status === 'quarantined').length

        return {
          ...range,
          totalIps: total,
          availableIps: available,
          assignedIps: assigned,
          reservedIps: reserved,
          quarantinedIps: quarantined,
          utilizationPercent: total > 0 ? Math.round((assigned / total) * 100) : 0,
        }
      })
    )

    // Separate assignments by status for stats
    const assignedCount = pool.assignments.filter((a) => a.status === 'assigned').length
    const availableCount = pool.assignments.filter((a) => a.status === 'available').length
    const reservedCount = pool.assignments.filter((a) => a.status === 'reserved').length
    const quarantinedCount = pool.assignments.filter((a) => a.status === 'quarantined').length

    return NextResponse.json({
      pool: {
        ...pool,
        ranges: enrichedRanges,
        totalIps: pool.assignments.length,
        availableIps: availableCount,
        assignedIps: assignedCount,
        reservedIps: reservedCount,
        quarantinedIps: quarantinedCount,
        utilizationPercent: pool.assignments.length > 0
          ? Math.round((assignedCount / pool.assignments.length) * 100)
          : 0,
      },
    })
  } catch (error) {
    console.error('Error fetching IP pool:', error)
    return NextResponse.json({ error: 'Failed to fetch IP pool' }, { status: 500 })
  }
}

// PUT /api/ip-pools/[id] - Update pool settings
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.ipPool.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'IP pool not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      description,
      network,
      gateway,
      subnetMask,
      dnsPrimary,
      dnsSecondary,
      leaseTime,
      type,
      status,
    } = body

    // Validate name if changing
    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'Pool name cannot be empty' }, { status: 400 })
    }
    if (name && name.trim() !== existing.name) {
      const dup = await db.ipPool.findUnique({ where: { name: name.trim() } })
      if (dup) {
        return NextResponse.json({ error: 'A pool with this name already exists' }, { status: 409 })
      }
    }

    // Validate IPs if changing
    if (gateway !== undefined && gateway && !isValidIp(gateway)) {
      return NextResponse.json({ error: 'Invalid gateway IP address' }, { status: 400 })
    }
    if (dnsPrimary !== undefined && dnsPrimary && !isValidIp(dnsPrimary)) {
      return NextResponse.json({ error: 'Invalid primary DNS IP address' }, { status: 400 })
    }
    if (dnsSecondary !== undefined && dnsSecondary && !isValidIp(dnsSecondary)) {
      return NextResponse.json({ error: 'Invalid secondary DNS IP address' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (network !== undefined) updateData.network = network.trim()
    if (gateway !== undefined) updateData.gateway = gateway?.trim() || null
    if (subnetMask !== undefined) updateData.subnetMask = subnetMask?.trim() || null
    if (dnsPrimary !== undefined) updateData.dnsPrimary = dnsPrimary?.trim() || null
    if (dnsSecondary !== undefined) updateData.dnsSecondary = dnsSecondary?.trim() || null
    if (leaseTime !== undefined) updateData.leaseTime = leaseTime ? parseInt(leaseTime) : 86400
    if (type !== undefined) updateData.type = type
    if (status !== undefined) updateData.status = status

    const updated = await db.ipPool.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ pool: updated })
  } catch (error) {
    console.error('Error updating IP pool:', error)
    return NextResponse.json({ error: 'Failed to update IP pool' }, { status: 500 })
  }
}

// DELETE /api/ip-pools/[id] - Delete pool (must have no active assignments)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.ipPool.findUnique({
      where: { id },
      include: {
        _count: {
          select: { assignments: true, users: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'IP pool not found' }, { status: 404 })
    }

    // Check for active assignments
    const activeAssignments = await db.ipAssignment.count({
      where: {
        poolId: id,
        status: 'assigned',
      },
    })

    if (activeAssignments > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete pool with ${activeAssignments} active assignment(s). Release all IPs first.`,
          activeAssignments,
        },
        { status: 409 }
      )
    }

    // Cascade delete will handle ranges and assignments
    await db.ipPool.delete({ where: { id } })

    return NextResponse.json({
      message: 'IP pool deleted successfully',
      poolId: id,
    })
  } catch (error) {
    console.error('Error deleting IP pool:', error)
    return NextResponse.json({ error: 'Failed to delete IP pool' }, { status: 500 })
  }
}
