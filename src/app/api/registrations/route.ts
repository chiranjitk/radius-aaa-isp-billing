import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/registrations - List registrations with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    const [registrations, total] = await Promise.all([
      db.registration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.registration.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      registrations,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error('Error listing registrations:', error)
    return NextResponse.json(
      { error: 'Failed to list registrations' },
      { status: 500 }
    )
  }
}

// POST /api/registrations - Submit new registration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      username,
      password,
      fullName,
      email,
      phone,
      company,
      address,
      planId,
    } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUser = await db.radUser.findUnique({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      )
    }

    // Check if there's a pending registration with same username
    const existingReg = await db.registration.findUnique({
      where: { username },
    })

    if (existingReg) {
      return NextResponse.json(
        { error: 'Registration already submitted for this username' },
        { status: 409 }
      )
    }

    // Generate a verification token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const registration = await db.registration.create({
      data: {
        username,
        password,
        fullName,
        email,
        phone,
        company,
        address,
        planId,
        token,
        tokenExpiresAt,
      },
    })

    return NextResponse.json(registration, { status: 201 })
  } catch (error) {
    console.error('Error creating registration:', error)
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    )
  }
}
