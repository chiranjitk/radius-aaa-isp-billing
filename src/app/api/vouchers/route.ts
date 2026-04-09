import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/vouchers - List all vouchers with filters and stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const locationId = searchParams.get('locationId') || ''
    const type = searchParams.get('type') || ''
    const batchId = searchParams.get('batchId') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    const where: Prisma.VoucherWhereInput = {}

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { username: { contains: search } },
        { macAddress: { contains: search } },
      ]
    }

    if (status) where.status = status
    if (locationId) where.locationId = locationId
    if (type) where.type = type
    if (batchId) where.batchId = batchId

    const skip = (page - 1) * limit

    const vouchers = await db.voucher.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
    })

    const total = await db.voucher.count({ where })

    const stats = await Promise.all([
      db.voucher.count(),
      db.voucher.count({ where: { status: 'available' } }),
      db.voucher.count({ where: { status: 'used' } }),
      db.voucher.count({ where: { status: 'expired' } }),
    ])

    return NextResponse.json({
      vouchers: vouchers.map((v) => ({
        id: v.id,
        code: v.code,
        batchId: v.batchId,
        locationId: v.locationId,
        locationName: v.location?.name || null,
        planId: v.planId,
        username: v.username,
        type: v.type,
        value: v.value,
        speedDown: v.speedDown,
        speedUp: v.speedUp,
        simultaneous: v.simultaneous,
        status: v.status,
        usedAt: v.usedAt,
        expiresAt: v.expiresAt,
        macAddress: v.macAddress,
        printedAt: v.printedAt,
        createdAt: v.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: stats[0],
        available: stats[1],
        used: stats[2],
        expired: stats[3],
      },
    })
  } catch (error) {
    console.error('Error fetching vouchers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vouchers' },
      { status: 500 }
    )
  }
}

// POST /api/vouchers - Create a single voucher
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      code,
      batchId,
      locationId,
      planId,
      type,
      value,
      speedDown,
      speedUp,
      simultaneous,
      expiresAt,
      macAddress,
    } = body

    if (!code || !code.trim()) {
      return NextResponse.json(
        { error: 'Voucher code is required' },
        { status: 400 }
      )
    }

    // Check for duplicate code
    const existing = await db.voucher.findUnique({ where: { code: code.trim() } })
    if (existing) {
      return NextResponse.json(
        { error: 'A voucher with this code already exists' },
        { status: 409 }
      )
    }

    const voucher = await db.voucher.create({
      data: {
        code: code.trim(),
        batchId: batchId || null,
        locationId: locationId || null,
        planId: planId || null,
        type: type || 'time',
        value: value || 0,
        speedDown: speedDown ? parseInt(speedDown) : null,
        speedUp: speedUp ? parseInt(speedUp) : null,
        simultaneous: simultaneous || 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        macAddress: macAddress?.trim() || null,
      },
    })

    return NextResponse.json({ voucher }, { status: 201 })
  } catch (error) {
    console.error('Error creating voucher:', error)
    return NextResponse.json(
      { error: 'Failed to create voucher' },
      { status: 500 }
    )
  }
}
