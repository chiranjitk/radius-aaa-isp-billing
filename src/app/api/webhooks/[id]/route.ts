import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/webhooks/[id] - Update a webhook
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.webhook.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, url, events, status } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (url !== undefined) updateData.url = url.trim()
    if (events !== undefined) updateData.events = JSON.stringify(events)
    if (status !== undefined) updateData.status = status

    const updated = await db.webhook.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ webhook: updated })
  } catch (error) {
    console.error('Error updating webhook:', error)
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 })
  }
}

// DELETE /api/webhooks/[id] - Delete a webhook and its deliveries
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.webhook.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    await db.webhook.delete({ where: { id } })

    return NextResponse.json({ message: 'Webhook deleted successfully', webhookId: id })
  } catch (error) {
    console.error('Error deleting webhook:', error)
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  }
}
