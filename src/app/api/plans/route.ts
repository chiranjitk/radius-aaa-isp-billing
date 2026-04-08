import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

// GET /api/plans — list plans with search, filters, pagination, subscription count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const planType = searchParams.get("planType") || ""
    const billingCycle = searchParams.get("billingCycle") || ""
    const status = searchParams.get("status") || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const where: Prisma.PlanWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (planType) {
      where.planType = planType
    }

    if (billingCycle) {
      where.billingCycle = billingCycle
    }

    if (status) {
      where.status = status
    }

    const [plans, total] = await Promise.all([
      db.plan.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        include: {
          _count: {
            select: { subscriptions: true, policyGroups: true },
          },
        },
      }),
      db.plan.count({ where }),
    ])

    // Get plan-type counts for summary cards
    const typeCounts = await db.plan.groupBy({
      by: ["planType"],
      where: { status: "active" },
      _count: { id: true },
    })

    const typeCountMap: Record<string, number> = {
      "time-based": 0,
      "data-based": 0,
      "flat-rate": 0,
      hybrid: 0,
    }
    for (const tc of typeCounts) {
      typeCountMap[tc.planType] = tc._count.id
    }

    return NextResponse.json({
      plans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      typeCounts: typeCountMap,
    })
  } catch (error) {
    console.error("Error fetching plans:", error)
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    )
  }
}

// POST /api/plans — create a new plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      description,
      planType,
      billingCycle,
      price,
      currency,
      dataLimit,
      timeLimit,
      speedDown,
      speedUp,
      simultaneous,
      priority,
      trialDays,
      gracePeriodDays,
      policyIds,
    } = body

    if (!name || !planType || !billingCycle) {
      return NextResponse.json(
        { error: "Name, planType, and billingCycle are required" },
        { status: 400 }
      )
    }

    const plan = await db.plan.create({
      data: {
        name,
        description: description || null,
        planType,
        billingCycle,
        price: parseFloat(price) || 0,
        currency: currency || "USD",
        dataLimit: dataLimit != null ? parseInt(dataLimit, 10) : null,
        timeLimit: timeLimit != null ? parseInt(timeLimit, 10) : null,
        speedDown: speedDown != null ? parseInt(speedDown, 10) : null,
        speedUp: speedUp != null ? parseInt(speedUp, 10) : null,
        simultaneous: parseInt(simultaneous, 10) || 1,
        priority: parseInt(priority, 10) || 0,
        trialDays: parseInt(trialDays, 10) || 0,
        gracePeriodDays: parseInt(gracePeriodDays, 10) || 0,
        isActive: true,
        status: "active",
        ...(Array.isArray(policyIds) && policyIds.length > 0
          ? {
              policyGroups: {
                create: policyIds.map((policyId: string) => ({
                  policyId,
                })),
              },
            }
          : {}),
      },
      include: {
        policyGroups: { include: { policy: true } },
        _count: { select: { subscriptions: true } },
      },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error("Error creating plan:", error)
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    )
  }
}
