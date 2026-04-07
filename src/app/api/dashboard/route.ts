import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    // =============================================
    // 1. User stats
    // =============================================
    const [totalUsers, activeUsers, disabledUsers, suspendedUsers] = await Promise.all([
      db.radUser.count(),
      db.radUser.count({ where: { status: "active" } }),
      db.radUser.count({ where: { status: "disabled" } }),
      db.radUser.count({ where: { status: "suspended" } }),
    ]);

    // =============================================
    // 2. NAS stats
    // =============================================
    const [totalNas, onlineNas] = await Promise.all([
      db.nas.count(),
      db.nas.count({ where: { status: "up" } }),
    ]);

    // =============================================
    // 3. Session stats
    // =============================================
    const activeSessions = await db.radAcct.count({
      where: { status: "active" },
    });

    const totalSessions = await db.radAcct.count();

    const bandwidthAgg = await db.radAcct.aggregate({
      _sum: {
        acctInputOctets: true,
        acctOutputOctets: true,
      },
    });

    const totalBandwidth =
      Number(bandwidthAgg._sum.acctInputOctets || 0) +
      Number(bandwidthAgg._sum.acctOutputOctets || 0);

    // =============================================
    // 4. Revenue & invoices
    // =============================================
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const revenueAgg = await db.invoice.aggregate({
      _sum: { total: true },
      where: {
        status: "paid",
        paidDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const pendingInvoices = await db.invoice.count({
      where: { status: "pending" },
    });

    const revenueThisMonth = revenueAgg._sum.total || 0;

    // =============================================
    // 5. Users by status distribution
    // =============================================
    const usersByStatus = [
      { name: "Active", value: activeUsers, fill: "#10b981" },
      { name: "Disabled", value: disabledUsers, fill: "#ef4444" },
      { name: "Suspended", value: suspendedUsers, fill: "#f59e0b" },
    ];

    // =============================================
    // 6. Sessions by auth type (via user relation)
    // =============================================
    const sessionsWithUser = await db.radAcct.findMany({
      where: { username: { not: null } },
      select: {
        username: true,
        user: {
          select: { authType: true },
        },
      },
    });

    const authTypeMap: Record<string, number> = {};
    for (const s of sessionsWithUser) {
      const authType = s.user?.authType || "Unknown";
      authTypeMap[authType] = (authTypeMap[authType] || 0) + 1;
    }

    const authTypeOrder = ["PAP", "CHAP", "MS-CHAPv2", "EAP"];
    const sessionsByAuthType = authTypeOrder
      .filter((t) => authTypeMap[t])
      .map((t) => ({
        name: t,
        sessions: authTypeMap[t] || 0,
      }));

    // Add any other auth types not in the order list
    for (const [key, val] of Object.entries(authTypeMap)) {
      if (!authTypeOrder.includes(key)) {
        sessionsByAuthType.push({ name: key, sessions: val });
      }
    }

    // =============================================
    // 7. Daily session counts for last 7 days
    // =============================================
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentSessions = await db.radAcct.findMany({
      where: {
        acctStartTime: { gte: sevenDaysAgo },
      },
      select: {
        acctStartTime: true,
      },
      orderBy: { acctStartTime: "asc" },
    });

    // Build day map
    const dailyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = 0;
    }

    for (const s of recentSessions) {
      const key = s.acctStartTime.toISOString().split("T")[0];
      if (dailyMap[key] !== undefined) {
        dailyMap[key]++;
      }
    }

    const dailySessions = Object.entries(dailyMap).map(([date, count]) => ({
      date,
      sessions: count,
    }));

    // =============================================
    // 8. Top 10 users by bandwidth usage
    // =============================================
    const topUsersBandwidth = await db.radAcct.groupBy({
      by: ["username"],
      where: { username: { not: null } },
      _sum: {
        acctInputOctets: true,
        acctOutputOctets: true,
      },
      orderBy: {
        _sum: {
          acctOutputOctets: "desc",
        },
      },
      take: 10,
    });

    const topUsersByBandwidth = topUsersBandwidth
      .map((u) => ({
        username: u.username || "Unknown",
        bandwidth: Number(u._sum.acctInputOctets || 0) + Number(u._sum.acctOutputOctets || 0),
      }))
      .sort((a, b) => b.bandwidth - a.bandwidth);

    // =============================================
    // 9. Top 5 NAS devices by session count
    // =============================================
    const topNasBySessions = await db.radAcct.groupBy({
      by: ["nasIpAddress"],
      where: { nasIpAddress: { not: null } },
      _count: { id: true },
      orderBy: {
        _count: { id: "desc" },
      },
      take: 5,
    });

    const topNasResults = await Promise.all(
      topNasBySessions.map(async (n) => {
        const nas = await db.nas.findUnique({
          where: { ipAddress: n.nasIpAddress! },
          select: { nasName: true, ipAddress: true },
        });
        return {
          name: nas?.nasName || n.nasIpAddress || "Unknown",
          ipAddress: nas?.ipAddress || n.nasIpAddress || "",
          sessions: n._count.id,
        };
      })
    );

    // =============================================
    // 10. Recent sessions (last 10)
    // =============================================
    const recentSessionsList = await db.radAcct.findMany({
      take: 10,
      orderBy: { acctStartTime: "desc" },
      include: {
        user: {
          select: { fullName: true, authType: true },
        },
        nas: {
          select: { nasName: true, ipAddress: true },
        },
      },
    });

    const recentSessionsFormatted = recentSessionsList.map((s) => ({
      id: s.id,
      sessionId: s.sessionId,
      username: s.username || "-",
      fullName: s.user?.fullName || null,
      nasIpAddress: s.nas?.ipAddress || s.nasIpAddress || "-",
      nasName: s.nas?.nasName || null,
      acctStartTime: s.acctStartTime,
      acctStopTime: s.acctStopTime,
      acctSessionTime: s.acctSessionTime,
      acctInputOctets: Number(s.acctInputOctets || 0),
      acctOutputOctets: Number(s.acctOutputOctets || 0),
      status: s.status,
      authType: s.user?.authType || null,
    }));

    // =============================================
    // 11. Recent invoices (last 5)
    // =============================================
    const recentInvoicesList = await db.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { fullName: true },
        },
      },
    });

    const recentInvoicesFormatted = recentInvoicesList.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      username: inv.username,
      fullName: inv.user?.fullName || null,
      amount: inv.amount,
      tax: inv.tax,
      total: inv.total,
      status: inv.status,
      dueDate: inv.dueDate,
      paidDate: inv.paidDate,
      createdAt: inv.createdAt,
    }));

    // =============================================
    // 12. System uptime info (hardcoded)
    // =============================================
    const systemInfo = {
      uptime: "15d 7h 32m",
      version: "FreeRADIUS 3.2.5",
      cpu: "12%",
      memory: "45%",
      connections: 342,
    };

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalNas,
      onlineNas,
      totalSessions,
      activeSessions,
      totalBandwidth,
      revenueThisMonth,
      pendingInvoices,
      usersByStatus,
      sessionsByAuthType,
      dailySessions,
      topUsersByBandwidth,
      topNasBySessions: topNasResults,
      recentSessions: recentSessionsFormatted,
      recentInvoices: recentInvoicesFormatted,
      systemInfo,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
