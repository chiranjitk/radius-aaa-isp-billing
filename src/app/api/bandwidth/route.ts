import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/bandwidth - Bandwidth usage analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(90, Math.max(7, Number(searchParams.get('days')) || 7))

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Fetch all sessions within the date range
    const sessions = await db.radAcct.findMany({
      where: {
        acctStartTime: { gte: startDate },
      },
      orderBy: { acctStartTime: 'asc' },
    })

    // Helper: compute real octets including gigawords
    function inputOctetsVal(input: bigint | null, inGW: bigint | null): number {
      return Number(input || 0) + Number(inGW || 0) * 4294967296
    }

    function outputOctetsVal(output: bigint | null, outGW: bigint | null): number {
      return Number(output || 0) + Number(outGW || 0) * 4294967296
    }

    // ========== 1. Aggregate per-user bandwidth ==========
    const userMap = new Map<string, {
      username: string
      totalDownload: number
      totalUpload: number
      sessions: number
      planName: string | null
      dataLimitMB: number | null
    }>()

    let grandTotalDownload = 0
    let grandTotalUpload = 0

    for (const s of sessions) {
      const uname = s.username || 'anonymous'
      const dl = outputOctetsVal(s.acctOutputOctets, s.acctOutputGigawords)
      const ul = inputOctetsVal(s.acctInputOctets, s.acctInputGigawords)

      grandTotalDownload += dl
      grandTotalUpload += ul

      const existing = userMap.get(uname)
      if (existing) {
        existing.totalDownload += dl
        existing.totalUpload += ul
        existing.sessions += 1
      } else {
        userMap.set(uname, {
          username: uname,
          totalDownload: dl,
          totalUpload: ul,
          sessions: 1,
          planName: null,
          dataLimitMB: null,
        })
      }
    }

    const grandTotal = grandTotalDownload + grandTotalUpload

    // Top users sorted by total bandwidth descending
    const topUsers = Array.from(userMap.values())
      .sort((a, b) => (b.totalDownload + b.totalUpload) - (a.totalDownload + a.totalUpload))
      .slice(0, 20)
      .map((u) => ({
        username: u.username,
        download: u.totalDownload,
        upload: u.totalUpload,
        total: u.totalDownload + u.totalUpload,
        sessions: u.sessions,
        percentOfTotal: grandTotal > 0 ? ((u.totalDownload + u.totalUpload) / grandTotal) * 100 : 0,
        planName: u.planName,
        dataLimitMB: u.dataLimitMB,
      }))

    // ========== 2. Daily bandwidth trend ==========
    const dailyMap = new Map<string, { date: string; download: number; upload: number; total: number }>()

    // Initialize all days in the range
    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0]
      dailyMap.set(key, { date: key, download: 0, upload: 0, total: 0 })
    }

    for (const s of sessions) {
      const day = s.acctStartTime.toISOString().split('T')[0]
      const entry = dailyMap.get(day)
      if (entry) {
        const dl = outputOctetsVal(s.acctOutputOctets, s.acctOutputGigawords)
        const ul = inputOctetsVal(s.acctInputOctets, s.acctInputGigawords)
        entry.download += dl
        entry.upload += ul
        entry.total += dl + ul
      }
    }

    const dailyTrend = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))

    // ========== 3. Peak day ==========
    const peakDay = dailyTrend.reduce(
      (max, d) => (d.total > max.total ? d : max),
      { date: '', download: 0, upload: 0, total: 0 }
    )

    // ========== 4. Active users count ==========
    const activeUserSet = new Set(
      sessions.filter((s) => s.status === 'active').map((s) => s.username).filter(Boolean)
    )

    // ========== 5. Data cap utilization ==========
    // Fetch active subscriptions with plan data limits for users who have sessions
    const activeUsers = Array.from(userMap.keys())
    let dataCapUtilization: Array<{ username: string; planName: string; dataLimitMB: number; usedMB: number; percentUsed: number }> = []
    if (activeUsers.length > 0) {
      const subs = await db.subscription.findMany({
        where: {
          username: { in: activeUsers },
          status: 'active',
        },
        include: { plan: { select: { name: true, dataLimit: true } } },
      })
      for (const sub of subs) {
        const u = userMap.get(sub.username)
        if (u && sub.plan && sub.plan.dataLimit && sub.plan.dataLimit > 0) {
          const usedMB = (u.totalDownload + u.totalUpload) / (1024 * 1024)
          dataCapUtilization.push({
            username: sub.username,
            planName: sub.plan.name,
            dataLimitMB: sub.plan.dataLimit,
            usedMB: Math.round(usedMB * 100) / 100,
            percentUsed: Math.min(100, Math.round((usedMB / sub.plan.dataLimit) * 10000) / 100),
          })
          u.planName = sub.plan.name
          u.dataLimitMB = sub.plan.dataLimit
        }
      }
      dataCapUtilization.sort((a, b) => b.percentUsed - a.percentUsed)
    }

    return NextResponse.json({
      totalStats: {
        totalUpload: grandTotalUpload,
        totalDownload: grandTotalDownload,
        total: grandTotal,
        peakDay: peakDay.date || 'N/A',
        peakDayTotal: peakDay.total,
        activeUsers: activeUserSet.size,
        totalUniqueUsers: userMap.size,
        days,
      },
      dailyTrend,
      topUsers,
      dataCapUtilization,
    })
  } catch (error) {
    console.error('Error fetching bandwidth analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bandwidth analytics' },
      { status: 500 }
    )
  }
}
