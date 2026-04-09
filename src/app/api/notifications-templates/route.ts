import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

// GET /api/notifications-templates — list notification templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") || ""
    const category = searchParams.get("category") || ""
    const status = searchParams.get("status") || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const where: Prisma.NotificationTemplateWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { subject: { contains: search } },
        { body: { contains: search } },
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

    const [templates, total] = await Promise.all([
      db.notificationTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.notificationTemplate.count({ where }),
    ])

    return NextResponse.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching notification templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch notification templates" },
      { status: 500 }
    )
  }
}

// POST /api/notifications-templates — create a new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, type, category, subject, body: templateBody, variables, channel, status } = body

    if (!name || !type || !category || !templateBody) {
      return NextResponse.json(
        { error: "Name, type, category, and body are required" },
        { status: 400 }
      )
    }

    const validTypes = ["email", "sms", "whatsapp", "push"]
    const validCategories = ["welcome", "invoice", "payment", "reminder", "alert", "suspension", "otp", "marketing"]

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      )
    }

    const template = await db.notificationTemplate.create({
      data: {
        name,
        type,
        category,
        subject: subject || null,
        body: templateBody,
        variables: variables ? JSON.stringify(variables) : null,
        channel: channel || type === "email" ? "smtp" : type === "sms" ? "twilio" : type === "whatsapp" ? "whatsapp_business" : "push",
        status: status || "active",
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Error creating notification template:", error)
    return NextResponse.json(
      { error: "Failed to create notification template" },
      { status: 500 }
    )
  }
}
