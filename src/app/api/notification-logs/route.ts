import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

// GET /api/notification-logs — list notification logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") || ""
    const category = searchParams.get("category") || ""
    const status = searchParams.get("status") || ""
    const dateFrom = searchParams.get("dateFrom") || ""
    const dateTo = searchParams.get("dateTo") || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const where: Prisma.NotificationLogWhereInput = {}

    if (search) {
      where.OR = [
        { recipient: { contains: search } },
        { subject: { contains: search } },
      ]
    }

    if (type) {
      where.type = type
    }

    if (category) {
      where.category = category
    }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.sentAt = {}
      if (dateFrom) {
        where.sentAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.sentAt.lte = new Date(dateTo)
      }
    }

    const [logs, total] = await Promise.all([
      db.notificationLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentAt: "desc" },
      }),
      db.notificationLog.count({ where }),
    ])

    // Stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [sentTodayCount, failedCount, totalCount] = await Promise.all([
      db.notificationLog.count({ where: { sentAt: { gte: today } } }),
      db.notificationLog.count({ where: { status: "failed" } }),
      db.notificationLog.count({}),
    ])

    const deliveredCount = await db.notificationLog.count({ where: { status: { in: ["delivered", "sent"] } } })
    const deliveryRate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        sentToday: sentTodayCount,
        failed: failedCount,
        deliveryRate,
        total: totalCount,
      },
    })
  } catch (error) {
    console.error("Error fetching notification logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch notification logs" },
      { status: 500 }
    )
  }
}

// POST /api/notification-logs — resend failed notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Provide an array of notification log IDs to resend" },
        { status: 400 }
      )
    }

    // Update the status of the failed notifications back to queued
    const result = await db.notificationLog.updateMany({
      where: {
        id: { in: ids },
        status: "failed",
      },
      data: {
        status: "queued",
        error: null,
      },
    })

    return NextResponse.json({
      success: true,
      resent: result.count,
      message: `${result.count} notification(s) queued for resend`,
    })
  } catch (error) {
    console.error("Error resending notifications:", error)
    return NextResponse.json(
      { error: "Failed to resend notifications" },
      { status: 500 }
    )
  }
}
