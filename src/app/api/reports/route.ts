import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/reports?type=usage|revenue|sessions|users|nas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'usage'
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const dateFilter: Prisma.RadAcctWhereInput = {}
    if (dateFrom || dateTo) {
      dateFilter.acctStartTime = {}
      if (dateFrom) dateFilter.acctStartTime.gte = new Date(dateFrom)
      if (dateTo) dateFilter.acctStartTime.lte = new Date(dateTo)
    }

    switch (type) {
      case 'usage':
        return generateUsageReport(dateFilter)
      case 'revenue':
        return generateRevenueReport(dateFrom, dateTo)
      case 'sessions':
        return generateSessionsReport(dateFilter)
      case 'users':
        return generateUsersReport(dateFrom, dateTo)
      case 'nas':
        return generateNasReport()
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

// ============ USAGE REPORT ============
async function generateUsageReport(dateFilter: Prisma.RadAcctWhereInput) {
  // Daily session counts (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const sessionsByDay = await db.radAcct.groupBy({
    by: ['acctStartTime'],
    where: {
      ...dateFilter,
      acctStartTime: { gte: thirtyDaysAgo },
    },
    _count: { id: true },
  })

  // Group by day
  const dailySessionsMap = new Map<string, number>()
  sessionsByDay.forEach((s) => {
    const day = new Date(s.acctStartTime).toISOString().split('T')[0]
    dailySessionsMap.set(day, (dailySessionsMap.get(day) || 0) + s._count.id)
  })
  const dailySessions = Array.from(dailySessionsMap.entries())
    .map(([date, count]) => ({ date, sessions: count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)

  // Top users by bandwidth
  const topUsers = await db.radAcct.groupBy({
    by: ['username'],
    where: dateFilter,
    _sum: {
      acctInputOctets: true,
      acctOutputOctets: true,
    },
    _count: { id: true },
    orderBy: { _sum: { acctInputOctets: 'desc' } },
    take: 10,
  })

  const topUsersBandwidth = topUsers
    .filter((u) => u.username)
    .map((u) => ({
      username: u.username || 'unknown',
      downloadGB: (Number(u._sum.acctInputOctets || 0) / (1024 ** 3)).toFixed(2),
      uploadGB: (Number(u._sum.acctOutputOctets || 0) / (1024 ** 3)).toFixed(2),
      totalGB: ((Number(u._sum.acctInputOctets || 0) + Number(u._sum.acctOutputOctets || 0)) / (1024 ** 3)).toFixed(2),
      sessions: u._count.id,
    }))

  // Data usage by group
  const userGroups = await db.radUserGroup.findMany()
  const groupMap = new Map<string, string[]>()
  userGroups.forEach((ug) => {
    const users = groupMap.get(ug.groupName) || []
    users.push(ug.username)
    groupMap.set(ug.groupName, users)
  })

  const groupUsage: { group: string; usage: number }[] = []
  for (const [group, usernames] of groupMap) {
    const usage = await db.radAcct.aggregate({
      where: { ...dateFilter, username: { in: usernames } },
      _sum: {
        acctInputOctets: true,
        acctOutputOctets: true,
      },
    })
    const total = Number(usage._sum.acctInputOctets || 0) + Number(usage._sum.acctOutputOctets || 0)
    groupUsage.push({ group, usage: Math.round(total / (1024 ** 3) * 100) / 100 })
  }

  const totalSessions = await db.radAcct.count({ where: dateFilter })
  const totalBandwidth = await db.radAcct.aggregate({
    where: dateFilter,
    _sum: { acctInputOctets: true, acctOutputOctets: true },
  })

  return NextResponse.json({
    type: 'usage',
    summary: {
      totalSessions,
      totalBandwidthGB: ((Number(totalBandwidth._sum.acctInputOctets || 0) + Number(totalBandwidth._sum.acctOutputOctets || 0)) / (1024 ** 3)).toFixed(2),
    },
    charts: {
      dailySessions,
      topUsersBandwidth,
      dataUsageByGroup: groupUsage,
    },
  })
}

// ============ REVENUE REPORT ============
async function generateRevenueReport(dateFrom: string, dateTo: string) {
  const invWhere: Prisma.InvoiceWhereInput = {}
  if (dateFrom || dateTo) {
    invWhere.createdAt = {}
    if (dateFrom) invWhere.createdAt.gte = new Date(dateFrom)
    if (dateTo) invWhere.createdAt.lte = new Date(dateTo)
  }

  // Revenue by month
  const allPaidInvoices = await db.invoice.findMany({
    where: { ...invWhere, status: 'paid' },
    select: { total: true, createdAt: true },
  })

  const monthlyRevenueMap = new Map<string, number>()
  allPaidInvoices.forEach((inv) => {
    const month = new Date(inv.createdAt).toISOString().slice(0, 7)
    monthlyRevenueMap.set(month, (monthlyRevenueMap.get(month) || 0) + inv.total)
  })
  const monthlyRevenue = Array.from(monthlyRevenueMap.entries())
    .map(([month, revenue]) => ({ month, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Revenue by plan
  const planRevenue = await db.invoice.groupBy({
    by: ['planId'],
    where: { ...invWhere, status: 'paid' },
    _sum: { total: true },
  })

  const planRevenueData = []
  for (const pr of planRevenue) {
    if (pr.planId) {
      const plan = await db.plan.findUnique({ where: { id: pr.planId }, select: { name: true } })
      if (plan) {
        planRevenueData.push({ plan: plan.name, revenue: pr._sum.total || 0 })
      }
    }
  }

  // Payment method distribution
  const paymentMethods = await db.payment.groupBy({
    by: ['method'],
    _sum: { amount: true },
    _count: { id: true },
  })

  const paymentMethodData = paymentMethods.map((pm) => ({
    method: pm.method,
    amount: pm._sum.amount || 0,
    count: pm._count.id,
  }))

  // Summary
  const totalRevenue = allPaidInvoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = await db.invoice.count({ where: { ...invWhere, status: 'paid' } })
  const avgInvoice = totalPaid > 0 ? totalRevenue / totalPaid : 0

  return NextResponse.json({
    type: 'revenue',
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      paidInvoices: totalPaid,
      avgInvoiceValue: Math.round(avgInvoice * 100) / 100,
    },
    charts: {
      monthlyRevenue,
      planRevenue: planRevenueData,
      paymentMethods: paymentMethodData,
    },
  })
}

// ============ SESSIONS REPORT ============
async function generateSessionsReport(dateFilter: Prisma.RadAcctWhereInput) {
  // Sessions by NAS
  const sessionsByNas = await db.radAcct.groupBy({
    by: ['nasIpAddress'],
    where: dateFilter,
    _count: { id: true },
  })

  const nasSessionData = []
  for (const s of sessionsByNas) {
    if (s.nasIpAddress) {
      const nas = await db.nas.findUnique({ where: { ipAddress: s.nasIpAddress }, select: { nasName: true, shortName: true } })
      nasSessionData.push({
        nas: nas?.shortName || nas?.nasName || s.nasIpAddress,
        sessions: s._count.id,
      })
    }
  }
  nasSessionData.sort((a, b) => b.sessions - a.sessions)

  // Sessions by auth type
  const sessionsByAuth = await db.radAcct.groupBy({
    by: ['acctAuthentic'],
    where: dateFilter,
    _count: { id: true },
  })
  const authTypeData = sessionsByAuth
    .filter((s) => s.acctAuthentic)
    .map((s) => ({ type: s.acctAuthentic!, count: s._count.id }))

  // Average session duration by day (last 14 days)
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const recentSessions = await db.radAcct.findMany({
    where: {
      ...dateFilter,
      acctStartTime: { gte: fourteenDaysAgo },
      acctSessionTime: { not: null },
    },
    select: { acctStartTime: true, acctSessionTime: true },
  })

  const dayDurationMap = new Map<string, { total: number; count: number }>()
  recentSessions.forEach((s) => {
    const day = new Date(s.acctStartTime).toISOString().split('T')[0]
    const current = dayDurationMap.get(day) || { total: 0, count: 0 }
    current.total += s.acctSessionTime || 0
    current.count += 1
    dayDurationMap.set(day, current)
  })

  const avgDuration = Array.from(dayDurationMap.entries())
    .map(([date, { total, count }]) => ({
      date,
      avgMinutes: Math.round(total / count / 60),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalSessions = await db.radAcct.count({ where: dateFilter })

  return NextResponse.json({
    type: 'sessions',
    summary: { totalSessions },
    charts: {
      sessionsByNas: nasSessionData,
      authTypes: authTypeData,
      avgDurationByDay: avgDuration,
    },
  })
}

// ============ USERS REPORT ============
async function generateUsersReport(dateFrom: string, dateTo: string) {
  // User registration trend (by month)
  const userWhere: Prisma.RadUserWhereInput = {}
  if (dateFrom || dateTo) {
    userWhere.createdAt = {}
    if (dateFrom) userWhere.createdAt.gte = new Date(dateFrom)
    if (dateTo) userWhere.createdAt.lte = new Date(dateTo)
  }

  const allUsers = await db.radUser.findMany({
    where: userWhere,
    select: { createdAt: true, status: true },
  })

  const monthlyRegMap = new Map<string, number>()
  allUsers.forEach((u) => {
    const month = new Date(u.createdAt).toISOString().slice(0, 7)
    monthlyRegMap.set(month, (monthlyRegMap.get(month) || 0) + 1)
  })
  const registrationTrend = Array.from(monthlyRegMap.entries())
    .map(([month, count]) => ({ month, users: count }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // User status distribution
  const statusDist = new Map<string, number>()
  allUsers.forEach((u) => statusDist.set(u.status, (statusDist.get(u.status) || 0) + 1))
  const userStatusData = Array.from(statusDist.entries()).map(([status, count]) => ({ status, count }))

  // Users by group
  const usersByGroup = await db.radUserGroup.groupBy({
    by: ['groupName'],
    _count: { id: true },
  })
  const groupData = usersByGroup.map((g) => ({ group: g.groupName, count: g._count.id }))

  return NextResponse.json({
    type: 'users',
    summary: {
      totalUsers: allUsers.length,
      activeUsers: statusDist.get('active') || 0,
    },
    charts: {
      registrationTrend,
      userStatus: userStatusData,
      usersByGroup: groupData,
    },
  })
}

// ============ NAS REPORT ============
async function generateNasReport() {
  const nases = await db.nas.findMany({
    include: {
      _count: {
        select: { acctRecords: true },
      },
    },
  })

  // Active sessions per NAS
  const nasUtilization = nases.map((nas) => ({
    nas: nas.shortName || nas.nasName,
    ipAddress: nas.ipAddress,
    status: nas.status,
    totalSessions: nas._count.acctRecords,
    ports: nas.ports,
    utilization: nas.ports > 0 ? Math.round((nas._count.acctRecords / nas.ports) * 100) : 0,
  }))

  // NAS by type
  const nasByType = new Map<string, number>()
  nases.forEach((nas) => nasByType.set(nas.nasType, (nasByType.get(nas.nasType) || 0) + 1))
  const nasTypeData = Array.from(nasByType.entries()).map(([type, count]) => ({ type, count }))

  const upNases = nases.filter((n) => n.status === 'up').length

  return NextResponse.json({
    type: 'nas',
    summary: {
      totalNas: nases.length,
      onlineNas: upNases,
      offlineNas: nases.length - upNases,
    },
    charts: {
      nasUtilization,
      nasTypes: nasTypeData,
    },
  })
}
