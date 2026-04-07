import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Helper: Convert IP to integer for comparison
function ipToLong(ip: string): number {
  const parts = ip.split('.').map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

// Helper: Validate IP address format
function isValidIp(ip: string): boolean {
  const regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
  const match = ip.match(regex)
  if (!match) return false
  return match.slice(1).every((octet) => {
    const n = parseInt(octet, 10)
    return n >= 0 && n <= 255
  })
}

// GET /api/ip-pools - List all pools with aggregate stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''

    const where: Prisma.IpPoolWhereInput = {}
    if (type) where.type = type
    if (status) where.status = status

    const pools = await db.ipPool.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            ranges: true,
            assignments: true,
            users: true,
          },
        },
        ranges: {
          orderBy: { startIp: 'asc' },
        },
      },
    })

    // Get assignment counts per pool in batch
    const poolIds = pools.map((p) => p.id)
    const assignmentCounts = poolIds.length > 0
      ? await db.ipAssignment.groupBy({
          by: ['poolId', 'status'],
          where: { poolId: { in: poolIds } },
          _count: true,
        })
      : []

    // Build a map of poolId -> { assigned, available, reserved, quarantined }
    const poolStatusCounts: Record<string, Record<string, number>> = {}
    for (const ac of assignmentCounts) {
      if (!poolStatusCounts[ac.poolId]) poolStatusCounts[ac.poolId] = {}
      poolStatusCounts[ac.poolId][ac.status] = ac._count
    }

    // Enrich pools with stats
    let globalTotalIps = 0
    let globalAssignedIps = 0

    const enrichedPools = pools.map((pool) => {
      const counts = poolStatusCounts[pool.id] || {}
      const assignedIps = counts['assigned'] || 0
      const availableIps = counts['available'] || 0
      const reservedIps = counts['reserved'] || 0
      const quarantinedIps = counts['quarantined'] || 0
      const totalIps = availableIps + assignedIps + reservedIps + quarantinedIps
      const utilizationPercent = totalIps > 0 ? Math.round((assignedIps / totalIps) * 100) : 0

      globalTotalIps += totalIps
      globalAssignedIps += assignedIps

      return {
        id: pool.id,
        name: pool.name,
        description: pool.description,
        network: pool.network,
        gateway: pool.gateway,
        subnetMask: pool.subnetMask,
        dnsPrimary: pool.dnsPrimary,
        dnsSecondary: pool.dnsSecondary,
        leaseTime: pool.leaseTime,
        type: pool.type,
        status: pool.status,
        createdAt: pool.createdAt,
        updatedAt: pool.updatedAt,
        rangesCount: pool._count.ranges,
        usersCount: pool._count.users,
        assignmentsCount: pool._count.assignments,
        totalIps,
        availableIps,
        assignedIps,
        reservedIps,
        quarantinedIps,
        utilizationPercent,
      }
    })

    return NextResponse.json({
      pools: enrichedPools,
      stats: {
        totalPools: pools.length,
        totalIps: globalTotalIps,
        availableIps: globalTotalIps - globalAssignedIps,
        assignedIps: globalAssignedIps,
        utilizationPercent: globalTotalIps > 0 ? Math.round((globalAssignedIps / globalTotalIps) * 100) : 0,
      },
    })
  } catch (error) {
    console.error('Error fetching IP pools:', error)
    return NextResponse.json(
      { error: 'Failed to fetch IP pools' },
      { status: 500 }
    )
  }
}

// POST /api/ip-pools - Create pool with initial ranges
export async function POST(request: NextRequest) {
  try {
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
      ranges,
    } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Pool name is required' }, { status: 400 })
    }
    if (!network || !network.trim()) {
      return NextResponse.json({ error: 'Network CIDR is required' }, { status: 400 })
    }

    // Validate network CIDR format
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
    if (!cidrRegex.test(network.trim())) {
      return NextResponse.json({ error: 'Invalid network CIDR format (e.g. 10.0.0.0/24)' }, { status: 400 })
    }

    // Validate optional IP fields
    if (gateway && !isValidIp(gateway)) {
      return NextResponse.json({ error: 'Invalid gateway IP address' }, { status: 400 })
    }
    if (dnsPrimary && !isValidIp(dnsPrimary)) {
      return NextResponse.json({ error: 'Invalid primary DNS IP address' }, { status: 400 })
    }
    if (dnsSecondary && !isValidIp(dnsSecondary)) {
      return NextResponse.json({ error: 'Invalid secondary DNS IP address' }, { status: 400 })
    }

    // Validate ranges if provided
    if (ranges && Array.isArray(ranges) && ranges.length > 0) {
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i]
        if (!r.startIp || !isValidIp(r.startIp)) {
          return NextResponse.json({ error: `Range ${i + 1}: Invalid start IP address` }, { status: 400 })
        }
        if (!r.endIp || !isValidIp(r.endIp)) {
          return NextResponse.json({ error: `Range ${i + 1}: Invalid end IP address` }, { status: 400 })
        }
        if (ipToLong(r.endIp) <= ipToLong(r.startIp)) {
          return NextResponse.json({ error: `Range ${i + 1}: End IP must be greater than start IP` }, { status: 400 })
        }
      }
    }

    // Check for duplicate pool name
    const existingPool = await db.ipPool.findUnique({
      where: { name: name.trim() },
    })
    if (existingPool) {
      return NextResponse.json({ error: 'A pool with this name already exists' }, { status: 409 })
    }

    // Create pool and ranges in a transaction
    const pool = await db.$transaction(async (tx) => {
      const newPool = await tx.ipPool.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          network: network.trim(),
          gateway: gateway?.trim() || null,
          subnetMask: subnetMask?.trim() || null,
          dnsPrimary: dnsPrimary?.trim() || null,
          dnsSecondary: dnsSecondary?.trim() || null,
          leaseTime: leaseTime ? parseInt(leaseTime) : 86400,
          type: type || 'dhcp',
        },
      })

      // Create ranges and individual IP assignments
      if (ranges && Array.isArray(ranges) && ranges.length > 0) {
        for (const r of ranges) {
          const newRange = await tx.ipPoolRange.create({
            data: {
              poolId: newPool.id,
              startIp: r.startIp.trim(),
              endIp: r.endIp.trim(),
              currentIp: r.startIp.trim(),
              isAvailable: true,
            },
          })

          // Create individual IP assignments for each IP in range
          const startLong = ipToLong(r.startIp)
          const endLong = ipToLong(r.endIp)
          const assignments: { ipAddress: string; poolId: string; rangeId: string; status: string }[] = []

          for (let ipLong = startLong; ipLong <= endLong; ipLong++) {
            const ipStr = [
              (ipLong >>> 24) & 255,
              (ipLong >>> 16) & 255,
              (ipLong >>> 8) & 255,
              ipLong & 255,
            ].join('.')

            // Skip gateway and network address if they match
            if (gateway && ipStr === gateway.trim()) continue

            assignments.push({
              ipAddress: ipStr,
              poolId: newPool.id,
              rangeId: newRange.id,
              status: 'available',
            })
          }

          // Batch create assignments (max 500 at a time for SQLite)
          const BATCH_SIZE = 500
          for (let i = 0; i < assignments.length; i += BATCH_SIZE) {
            const batch = assignments.slice(i, i + BATCH_SIZE)
            await tx.ipAssignment.createMany({
              data: batch,
            })
          }
        }
      }

      return newPool
    })

    return NextResponse.json({ pool }, { status: 201 })
  } catch (error) {
    console.error('Error creating IP pool:', error)
    return NextResponse.json(
      { error: 'Failed to create IP pool' },
      { status: 500 }
    )
  }
}
