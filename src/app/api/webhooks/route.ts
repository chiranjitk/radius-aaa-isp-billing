import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import crypto from 'crypto'

// GET /api/webhooks - List all webhooks with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    const where: Prisma.WebhookWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { url: { contains: search } },
      ]
    }
    if (status) where.status = status

    const skip = (page - 1) * limit

    const webhooks = await db.webhook.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await db.webhook.count({ where })

    // Compute stats
    const totalCount = await db.webhook.count()
    const activeCount = await db.webhook.count({ where: { status: 'active' } })
    const deliveryCount = await db.webhookDelivery.count()
    const successCount = await db.webhookDelivery.count({ where: { status: 'success' } })
    const failCount = await db.webhookDelivery.count({ where: { status: 'failed' } })
    const totalDeliveries = successCount + failCount
    const successRate = totalDeliveries > 0 ? Math.round((successCount / totalDeliveries) * 100) : 0

    return NextResponse.json({
      webhooks: webhooks.map((w) => ({
        id: w.id,
        name: w.name,
        url: w.url,
        secret: w.secret,
        events: w.events,
        status: w.status,
        lastTriggered: w.lastTriggered,
        successCount: w.successCount,
        failureCount: w.failureCount,
        createdBy: w.createdBy,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats: {
        total: totalCount,
        active: activeCount,
        deliveries: deliveryCount,
        successRate,
      },
    })
  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
  }
}

// POST /api/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, url, events, secret, status, createdBy } = body

    if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Name, URL, and at least one event are required' },
        { status: 400 }
      )
    }

    const webhookSecret = secret || `whsec_${crypto.randomBytes(32).toString('hex')}`

    const webhook = await db.webhook.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        secret: webhookSecret,
        events: JSON.stringify(events),
        status: status || 'active',
        createdBy: createdBy || 'admin',
      },
    })

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        secret: webhook.secret,
        events: webhook.events,
        status: webhook.status,
        lastTriggered: webhook.lastTriggered,
        successCount: webhook.successCount,
        failureCount: webhook.failureCount,
        createdBy: webhook.createdBy,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating webhook:', error)
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
  }
}
