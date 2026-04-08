import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import crypto from 'crypto'

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = `sk_live_${crypto.randomBytes(32).toString('hex')}`
  const prefix = `${key.slice(0, 4)}****${key.slice(-4)}`
  // Hash with SHA-256
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  return { key, prefix, hash }
}

// GET /api/api-keys - List all API keys with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    const where: Prisma.ApiKeyWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { keyPrefix: { contains: search } },
      ]
    }
    if (status) where.status = status

    const skip = (page - 1) * limit

    const apiKeys = await db.apiKey.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    })

    const total = await db.apiKey.count({ where })

    // Compute stats
    const totalCount = await db.apiKey.count()
    const activeCount = await db.apiKey.count({ where: { status: 'active' } })

    // Average rate limit across active keys
    const activeKeys = await db.apiKey.findMany({
      where: { status: 'active' },
      select: { rateLimit: true },
    })
    const avgRateLimit = activeKeys.length > 0
      ? Math.round(activeKeys.reduce((sum, k) => sum + k.rateLimit, 0) / activeKeys.length)
      : 0

    // Requests today — simulated count based on lastUsedAt
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const usedToday = await db.apiKey.count({
      where: {
        lastUsedAt: { gte: todayStart },
      },
    })

    return NextResponse.json({
      apiKeys: apiKeys.map((k) => ({
        id: k.id,
        name: k.name,
        keyHash: k.keyHash,
        keyPrefix: k.keyPrefix,
        adminId: k.adminId,
        permissions: k.permissions,
        rateLimit: k.rateLimit,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        status: k.status,
        createdAt: k.createdAt,
        updatedAt: k.updatedAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats: {
        total: totalCount,
        active: activeCount,
        requestsToday: usedToday,
        avgRateLimit,
      },
    })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

// POST /api/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, permissions, rateLimit, expiresAt, adminId } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const perms = Array.isArray(permissions) ? permissions.join(',') : (permissions || 'read')
    const { key, prefix, hash } = generateApiKey()

    const apiKey = await db.apiKey.create({
      data: {
        name: name.trim(),
        keyHash: hash,
        keyPrefix: prefix,
        adminId: adminId || 'admin',
        permissions: perms,
        rateLimit: rateLimit ? parseInt(rateLimit) : 1000,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'active',
      },
    })

    return NextResponse.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        lastUsedAt: apiKey.lastUsedAt,
        expiresAt: apiKey.expiresAt,
        status: apiKey.status,
        createdAt: apiKey.createdAt,
        updatedAt: apiKey.updatedAt,
      },
      // Full key shown only once
      plainKey: key,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
