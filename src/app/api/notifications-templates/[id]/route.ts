import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET /api/notifications-templates/[id] — single template
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const template = await db.notificationTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Parse variables from JSON string
    let parsedVariables = []
    if (template.variables) {
      try {
        parsedVariables = JSON.parse(template.variables)
      } catch {
        parsedVariables = []
      }
    }

    return NextResponse.json({
      ...template,
      parsedVariables,
    })
  } catch (error) {
    console.error("Error fetching notification template:", error)
    return NextResponse.json(
      { error: "Failed to fetch notification template" },
      { status: 500 }
    )
  }
}

// PUT /api/notifications-templates/[id] — update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.notificationTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    const { name, type, category, subject, body: templateBody, variables, channel, status } = body

    const template = await db.notificationTemplate.update({
      where: { id },
      data: {
        ...(name != null && { name }),
        ...(type != null && { type }),
        ...(category != null && { category }),
        ...(subject != null && { subject }),
        ...(templateBody != null && { body: templateBody }),
        ...(variables != null && { variables: JSON.stringify(variables) }),
        ...(channel != null && { channel }),
        ...(status != null && { status }),
      },
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error updating notification template:", error)
    return NextResponse.json(
      { error: "Failed to update notification template" },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications-templates/[id] — delete template
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.notificationTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    await db.notificationTemplate.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting notification template:", error)
    return NextResponse.json(
      { error: "Failed to delete notification template" },
      { status: 500 }
    )
  }
}
