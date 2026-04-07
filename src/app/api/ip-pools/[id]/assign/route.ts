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

// Helper: Integer to IP string
function longToIp(long: number): string {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255,
  ].join('.')
}

// POST /api/ip-pools/[id]/assign - Assign next available IP from pool
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { username, macAddress, hostname } = body

    if (!username || !username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    // Verify pool exists and is active
    const pool = await db.ipPool.findUnique({
      where: { id },
    })
    if (!pool) {
      return NextResponse.json({ error: 'IP pool not found' }, { status: 404 })
    }
    if (pool.status === 'disabled') {
      return NextResponse.json({ error: 'IP pool is disabled' }, { status: 400 })
    }

    // Get ranges for this pool
    const ranges = await db.ipPoolRange.findMany({
      where: { poolId: id, isAvailable: true },
      orderBy: { startIp: 'asc' },
    })

    if (ranges.length === 0) {
      return NextResponse.json({ error: 'No IP ranges available in this pool' }, { status: 400 })
    }

    // Try to find next available IP (sequential allocation)
    for (const range of ranges) {
      const startLong = ipToLong(range.startIp)
      const endLong = ipToLong(range.endIp)
      const currentLong = range.currentIp ? ipToLong(range.currentIp) : startLong

      // Search from currentIp to endIp, then from startIp to currentIp
      for (let offset = 0; offset <= (endLong - startLong); offset++) {
        const tryLong1 = currentLong + offset
        const tryLong2 = startLong + offset

        const ipsToTry = [
          ...(tryLong1 >= startLong && tryLong1 <= endLong ? [tryLong1] : []),
        ]

        // Add wrap-around IPs
        if (tryLong1 > endLong) {
          const wrapCount = tryLong1 - endLong - 1
          if (wrapCount < offset && startLong + wrapCount < currentLong) {
            ipsToTry.push(startLong + wrapCount)
          }
        }

        // Simple approach: scan from currentIp forward then from start
        const candidates: number[] = []
        for (let i = currentLong; i <= endLong; i++) {
          candidates.push(i)
        }
        if (currentLong > startLong) {
          for (let i = startLong; i < currentLong; i++) {
            candidates.push(i)
          }
        }

        // Find first available IP
        for (const candidateLong of candidates) {
          const candidateIp = longToIp(candidateLong)

          const existingAssignment = await db.ipAssignment.findUnique({
            where: { ipAddress: candidateIp },
          })

          if (existingAssignment && existingAssignment.status === 'available') {
            // Assign this IP
            const assignment = await db.ipAssignment.update({
              where: { id: existingAssignment.id },
              data: {
                status: 'assigned',
                username: username.trim(),
                macAddress: macAddress?.trim() || null,
                hostname: hostname?.trim() || null,
                assignedAt: new Date(),
                releasedAt: null,
              },
            })

            // Update range currentIp pointer
            const nextIp = candidateLong < endLong ? longToIp(candidateLong + 1) : longToIp(startLong)
            await db.ipPoolRange.update({
              where: { id: range.id },
              data: { currentIp: nextIp },
            })

            // Update user's ipPoolId and ipType
            await db.radUser.update({
              where: { username: username.trim() },
              data: {
                ipPoolId: id,
                ipType: 'pool',
              },
            }).catch(() => {
              // User may not exist, ignore
            })

            // Check if pool is full
            const remainingAvailable = await db.ipAssignment.count({
              where: {
                rangeId: range.id,
                status: 'available',
              },
            })
            if (remainingAvailable === 0) {
              await db.ipPoolRange.update({
                where: { id: range.id },
                data: { isAvailable: false },
              })
            }

            // Check if all ranges are full
            const anyAvailableRange = await db.ipPoolRange.findFirst({
              where: { poolId: id, isAvailable: true },
            })
            if (!anyAvailableRange) {
              await db.ipPool.update({
                where: { id },
                data: { status: 'full' },
              })
            }

            return NextResponse.json({
              assignment: {
                id: assignment.id,
                ipAddress: assignment.ipAddress,
                username: assignment.username,
                macAddress: assignment.macAddress,
                hostname: assignment.hostname,
                status: assignment.status,
                assignedAt: assignment.assignedAt,
              },
            })
          }
        }
      }
    }

    return NextResponse.json({ error: 'No available IP addresses in this pool' }, { status: 400 })
  } catch (error) {
    console.error('Error assigning IP:', error)
    return NextResponse.json({ error: 'Failed to assign IP' }, { status: 500 })
  }
}
