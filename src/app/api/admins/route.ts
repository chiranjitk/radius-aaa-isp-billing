import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/admins - List all admins with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    const where: Prisma.AdminWhereInput = {}

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { email: { contains: search } },
      ]
    }
    if (role) where.role = role
    if (status) where.status = status

    const skip = (page - 1) * limit

    const admins = await db.admin.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        loginAttempts: true,
        lockedUntil: true,
        passwordChangedAt: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const total = await db.admin.count({ where })

    // Stats
    const totalAdmins = await db.admin.count()
    const activeAdmins = await db.admin.count({ where: { status: 'active' } })
    const lockedAdmins = await db.admin.count({ where: { status: 'locked' } })
    const twoFAEnabled = await db.admin.count({ where: { twoFactorEnabled: true } })

    return NextResponse.json({
      admins,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats: {
        total: totalAdmins,
        active: activeAdmins,
        locked: lockedAdmins,
        twoFAEnabled,
      },
    })
  } catch (error) {
    console.error('Error fetching admins:', error)
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 })
  }
}

// POST /api/admins - Create a new admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, fullName, email, phone, role } = body

    if (!username || !password || !email) {
      return NextResponse.json(
        { error: 'Username, password, and email are required' },
        { status: 400 }
      )
    }

    // Check for uniqueness
    const existing = await db.admin.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: existing.username === username ? 'Username already exists' : 'Email already exists' },
        { status: 409 }
      )
    }

    const admin = await db.admin.create({
      data: {
        username: username.trim().toLowerCase(),
        password,
        fullName: fullName?.trim() || null,
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        role: role || 'operator',
        status: 'active',
        passwordChangedAt: new Date(),
      },
    })

    return NextResponse.json({ admin }, { status: 201 })
  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 })
  }
}
