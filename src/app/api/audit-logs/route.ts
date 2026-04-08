import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/audit-logs — List audit logs with filters & pagination
// Query params: page, limit, action, module, startDate, endDate, username
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || ''
    const module_ = searchParams.get('module') || ''
    const username = searchParams.get('username') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const where: Prisma.AuditLogWhereInput = {}

    if (action) where.action = action
    if (module_) where.module = module_
    if (username) {
      where.username = { contains: username }
    }

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.timestamp.lte = end
      }
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    // Compute summary stats
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [totalEvents24h, loginSuccessCount, loginTotalCount] = await Promise.all([
      db.auditLog.count({
        where: { timestamp: { gte: oneDayAgo } },
      }),
      db.auditLog.count({
        where: { timestamp: { gte: oneDayAgo }, action: { in: ['login', 'auth_success'] } },
      }),
      db.auditLog.count({
        where: { timestamp: { gte: oneDayAgo }, action: { in: ['login', 'auth_success', 'auth_failed', 'login_failed'] } },
      }),
    ])

    const authSuccessRate = loginTotalCount > 0
      ? Math.round((loginSuccessCount / loginTotalCount) * 100)
      : 100

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      stats: {
        totalEvents24h,
        authSuccessRate,
        activeAlerts: 0,
        apiRequests: totalEvents24h,
      },
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
