import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/users - List users with search, pagination, status filter, group filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const group = searchParams.get('group') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { email: { contains: search } },
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (group) {
      where.groups = {
        some: {
          groupName: group,
        },
      }
    }

    const [users, total] = await Promise.all([
      db.radUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          groups: {
            include: {
              group: true,
            },
            orderBy: { priority: 'asc' },
          },
          _count: {
            select: {
              checkAttrs: true,
              replyAttrs: true,
              sessions: true,
              subscriptions: true,
            },
          },
        },
      }),
      db.radUser.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      users,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error('Error listing users:', error)
    return NextResponse.json(
      { error: 'Failed to list users' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create a new RADIUS user
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
      authType = 'PAP',
      simultaneous = 1,
      status = 'active',
      groupIds = [],
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

    // Validate group IDs if provided
    if (groupIds.length > 0) {
      const groups = await db.radGroup.findMany({
        where: { id: { in: groupIds } },
      })

      if (groups.length !== groupIds.length) {
        return NextResponse.json(
          { error: 'One or more specified groups do not exist' },
          { status: 400 }
        )
      }
    }

    // Create user with password check attribute
    const user = await db.radUser.create({
      data: {
        username,
        password,
        fullName,
        email,
        phone,
        company,
        address,
        authType,
        simultaneous,
        status,
        checkAttrs: {
          create: {
            attribute: 'Cleartext-Password',
            op: ':=',
            value: password,
          },
        },
        groups: groupIds.length > 0
          ? {
              create: groupIds.map((groupId: string) => ({
                group: { connect: { id: groupId } },
              })),
            }
          : undefined,
      },
      include: {
        groups: {
          include: {
            group: true,
          },
        },
        checkAttrs: true,
        replyAttrs: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
