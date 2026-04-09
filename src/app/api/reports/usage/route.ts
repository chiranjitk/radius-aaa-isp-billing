import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/reports/usage?period=daily|weekly|monthly&dateFrom=...&dateTo=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'daily'
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const dateFilter: Prisma.RadAcctWhereInput = {}
    if (dateFrom || dateTo) {
      dateFilter.acctStartTime = {}
      if (dateFrom) dateFilter.acctStartTime.gte = new Date(dateFrom)
      if (dateTo) dateFilter.acctStartTime.lte = new Date(dateTo + 'T23:59:59.999Z')
    }

    // Fetch all sessions within range for analysis
    const sessions = await db.radAcct.findMany({
      where: dateFilter,
      select: {
        username: true,
        acctStartTime: true,
        acctSessionTime: true,
        acctInputOctets: true,
        acctOutputOctets: true,
      },
      orderBy: { acctStartTime: 'desc' },
    })

    // Aggregate per-user usage
    const userMap = new Map<string, { download: bigint; upload: bigint; sessions: number; totalTime: number }>()
    for (const s of sessions) {
      if (!s.username) continue
      const cur = userMap.get(s.username) || { download: 0n, upload: 0n, sessions: 0, totalTime: 0 }
      cur.download += BigInt(s.acctInputOctets || 0)
      cur.upload += BigInt(s.acctOutputOctets || 0)
      cur.sessions += 1
      cur.totalTime += s.acctSessionTime || 0
      userMap.set(s.username, cur)
    }

    // Build user table sorted by total data
    const userUsage = Array.from(userMap.entries())
      .map(([username, data]) => ({
        username,
        downloadGB: Number(data.download) / (1024 ** 3),
        uploadGB: Number(data.upload) / (1024 ** 3),
        totalGB: Number(data.download + data.upload) / (1024 ** 3),
        sessions: data.sessions,
        avgDurationMin: data.sessions > 0 ? Math.round(data.totalTime / data.sessions / 60) : 0,
      }))
      .sort((a, b) => b.totalGB - a.totalGB)

    // Top 10 consumers for chart
    const topConsumers = userUsage.slice(0, 10).map((u) => ({
      username: u.username,
      totalGB: Number(u.totalGB.toFixed(2)),
    }))

    // Time-series data based on period
    const timeSeriesMap = new Map<string, { download: bigint; upload: bigint; sessions: number }>()
    for (const s of sessions) {
      let key: string
      const d = new Date(s.acctStartTime)
      if (period === 'daily') {
        key = d.toISOString().split('T')[0]
      } else if (period === 'weekly') {
        // Get Monday of the week
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(d)
        monday.setDate(diff)
        key = monday.toISOString().split('T')[0]
      } else {
        key = d.toISOString().slice(0, 7)
      }
      const cur = timeSeriesMap.get(key) || { download: 0n, upload: 0n, sessions: 0 }
      cur.download += BigInt(s.acctInputOctets || 0)
      cur.upload += BigInt(s.acctOutputOctets || 0)
      cur.sessions += 1
      timeSeriesMap.set(key, cur)
    }

    const timeSeries = Array.from(timeSeriesMap.entries())
      .map(([date, data]) => ({
        date,
        downloadGB: Number((data.download) / (1024 ** 3)).toFixed(2),
        uploadGB: Number((data.upload) / (1024 ** 3)).toFixed(2),
        totalGB: Number((data.download + data.upload) / (1024 ** 3)).toFixed(2),
        sessions: data.sessions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Data cap utilization (from plan dataLimit)
    const activeSubs = await db.subscription.findMany({
      where: { status: 'active' },
      include: { plan: { select: { name: true, dataLimit: true } }, user: { select: { username: true } } },
    })

    const capUtilization = activeSubs
      .filter((s) => s.plan.dataLimit && userMap.has(s.user.username))
      .map((s) => {
        const usage = userMap.get(s.user.username)
        const totalMB = usage ? Number(usage.download + usage.upload) / (1024 ** 2) : 0
        const capMB = s.plan.dataLimit || 1
        return {
          username: s.user.username,
          planName: s.plan.name,
          usedMB: Math.round(totalMB),
          capMB: capMB,
          percent: Math.min(100, Math.round((totalMB / capMB) * 100)),
        }
      })
      .sort((a, b) => b.percent - a.percent)

    // Summary
    const totalDownload = sessions.reduce((s, r) => s + Number(r.acctInputOctets || 0), 0)
    const totalUpload = sessions.reduce((s, r) => s + Number(r.acctOutputOctets || 0), 0)
    const totalSessionTime = sessions.reduce((s, r) => s + (r.acctSessionTime || 0), 0)

    return NextResponse.json({
      summary: {
        totalUsers: userUsage.length,
        totalSessions: sessions.length,
        totalDownloadGB: Number((totalDownload / (1024 ** 3)).toFixed(2)),
        totalUploadGB: Number((totalUpload / (1024 ** 3)).toFixed(2)),
        totalDataGB: Number(((totalDownload + totalUpload) / (1024 ** 3)).toFixed(2)),
        avgSessionMin: sessions.length > 0 ? Math.round(totalSessionTime / sessions.length / 60) : 0,
      },
      topConsumers,
      timeSeries,
      userUsage: userUsage.slice(0, 50),
      capUtilization,
    })
  } catch (error) {
    console.error('Usage report error:', error)
    return NextResponse.json({ error: 'Failed to generate usage report' }, { status: 500 })
  }
}
