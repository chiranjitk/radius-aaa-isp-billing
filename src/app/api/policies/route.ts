import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/policies - List policies with filters, search, and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''

    const where: Prisma.PolicyWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (type && ['bandwidth', 'time', 'data', 'access', 'acl', 'firewall'].includes(type)) {
      where.type = type
    }

    if (status && ['active', 'disabled'].includes(status)) {
      where.status = status
    }

    const [policies, total] = await Promise.all([
      db.policy.findMany({
        where,
        include: {
          rules: {
            orderBy: { priority: 'desc' },
          },
          planGroups: {
            include: {
              plan: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                },
              },
            },
          },
          _count: {
            select: {
              rules: true,
              planGroups: true,
            },
          },
        },
        orderBy: { priority: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.policy.count({ where }),
    ])

    // Calculate stats
    const [totalPolicies, activePolicies, totalRules, bandwidthCount, timeCount, dataCount, accessCount, aclCount, firewallCount] = await Promise.all([
      db.policy.count(),
      db.policy.count({ where: { status: 'active' } }),
      db.policyRule.count(),
      db.policy.count({ where: { type: 'bandwidth' } }),
      db.policy.count({ where: { type: 'time' } }),
      db.policy.count({ where: { type: 'data' } }),
      db.policy.count({ where: { type: 'access' } }),
      db.policy.count({ where: { type: 'acl' } }),
      db.policy.count({ where: { type: 'firewall' } }),
    ])

    return NextResponse.json({
      policies,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalPolicies,
        activePolicies,
        totalRules,
        bandwidthCount,
        timeCount,
        dataCount,
        accessCount,
        aclCount,
        firewallCount,
      },
    })
  } catch (error) {
    console.error('Error fetching policies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    )
  }
}

// POST /api/policies - Create a new policy with rules
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, type, priority, status, rules } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    const validTypes = ['bandwidth', 'time', 'data', 'access', 'acl', 'firewall']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid policy type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create policy with rules in a transaction
    const policy = await db.$transaction(async (tx) => {
      const newPolicy = await tx.policy.create({
        data: {
          name,
          description: description || null,
          type,
          priority: priority ?? 0,
          status: status || 'active',
          rules: rules && rules.length > 0
            ? {
                create: rules.map((rule: {
                  name: string
                  attribute: string
                  operator: string
                  value: string
                  description?: string
                  priority?: number
                }) => ({
                  name: rule.name,
                  attribute: rule.attribute,
                  operator: rule.operator || '=',
                  value: rule.value,
                  description: rule.description || null,
                  priority: rule.priority ?? 0,
                })),
              }
            : undefined,
        },
        include: {
          rules: {
            orderBy: { priority: 'desc' },
          },
        },
      })

      return newPolicy
    })

    return NextResponse.json({ policy }, { status: 201 })
  } catch (error) {
    console.error('Error creating policy:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A policy with this name already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create policy' },
      { status: 500 }
    )
  }
}
