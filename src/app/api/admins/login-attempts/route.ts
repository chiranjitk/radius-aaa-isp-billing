import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/admins/login-attempts - Get recent login attempts across all admins
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const success = searchParams.get('success')
    const username = searchParams.get('username') || ''

    const where: Prisma.LoginAttemptWhereInput = {}

    if (username) {
      where.username = { contains: username }
    }
    if (success !== null && success !== undefined && success !== '') {
      where.success = success === 'true'
    }

    const loginAttempts = await db.loginAttempt.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    // Aggregate stats
    const totalAttempts = await db.loginAttempt.count({ where })
    const successfulAttempts = await db.loginAttempt.count({
      where: { ...where, success: true },
    })
    const failedAttempts = await db.loginAttempt.count({
      where: { ...where, success: false },
    })

    // Get recent failed attempts (last 24h) for security alert
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentFailed = await db.loginAttempt.count({
      where: {
        success: false,
        timestamp: { gte: oneDayAgo },
      },
    })

    return NextResponse.json({
      loginAttempts,
      stats: {
        total: totalAttempts,
        successful: successfulAttempts,
        failed: failedAttempts,
        recentFailed24h: recentFailed,
      },
    })
  } catch (error) {
    console.error('Error fetching login attempts:', error)
    return NextResponse.json({ error: 'Failed to fetch login attempts' }, { status: 500 })
  }
}
