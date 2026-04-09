import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/webhooks/[id]/deliveries - Get delivery logs for a webhook
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const status = searchParams.get('status') || ''

    const webhook = await db.webhook.findUnique({ where: { id } })
    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const where: Prisma.WebhookDeliveryWhereInput = { webhookId: id }
    if (status) where.status = status

    const skip = (page - 1) * limit

    const deliveries = await db.webhookDelivery.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await db.webhookDelivery.count({ where })

    return NextResponse.json({
      deliveries: deliveries.map((d) => ({
        id: d.id,
        webhookId: d.webhookId,
        eventId: d.eventId,
        eventType: d.eventType,
        payload: d.payload,
        responseCode: d.responseCode,
        responseBody: d.responseBody,
        status: d.status,
        attempts: d.attempts,
        nextRetry: d.nextRetry,
        duration: d.duration,
        createdAt: d.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error fetching webhook deliveries:', error)
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 })
  }
}
