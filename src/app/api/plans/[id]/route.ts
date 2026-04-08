import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET /api/plans/[id] — single plan with policies and subscriptions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const plan = await db.plan.findUnique({
      where: { id },
      include: {
        policyGroups: {
          include: { policy: { include: { rules: true } } },
          orderBy: { policyId: "asc" },
        },
        subscriptions: {
          include: {
            user: {
              select: {
                username: true,
                fullName: true,
                email: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: { select: { subscriptions: true, invoices: true } },
      },
    })

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error("Error fetching plan:", error)
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    )
  }
}

// PUT /api/plans/[id] — update plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.plan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

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
      status,
      isActive,
      policyIds,
    } = body

    // Handle policy group updates if policyIds provided
    if (Array.isArray(policyIds)) {
      // Delete old policy links
      await db.planPolicyGroup.deleteMany({ where: { planId: id } })
      // Create new policy links
      if (policyIds.length > 0) {
        await db.planPolicyGroup.createMany({
          data: policyIds.map((policyId: string) => ({ planId: id, policyId })),
        })
      }
    }

    const plan = await db.plan.update({
      where: { id },
      data: {
        ...(name != null && { name }),
        ...(description != null && { description }),
        ...(planType != null && { planType }),
        ...(billingCycle != null && { billingCycle }),
        ...(price != null && { price: parseFloat(price) }),
        ...(currency != null && { currency }),
        ...(dataLimit != null && { dataLimit: dataLimit === "" ? null : parseInt(dataLimit, 10) }),
        ...(timeLimit != null && { timeLimit: timeLimit === "" ? null : parseInt(timeLimit, 10) }),
        ...(speedDown != null && { speedDown: speedDown === "" ? null : parseInt(speedDown, 10) }),
        ...(speedUp != null && { speedUp: speedUp === "" ? null : parseInt(speedUp, 10) }),
        ...(simultaneous != null && { simultaneous: parseInt(simultaneous, 10) }),
        ...(priority != null && { priority: parseInt(priority, 10) }),
        ...(trialDays != null && { trialDays: parseInt(trialDays, 10) }),
        ...(gracePeriodDays != null && { gracePeriodDays: parseInt(gracePeriodDays, 10) }),
        ...(status != null && { status }),
        ...(isActive != null && { isActive }),
      },
      include: {
        policyGroups: { include: { policy: true } },
        _count: { select: { subscriptions: true } },
      },
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error("Error updating plan:", error)
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    )
  }
}

// DELETE /api/plans/[id] — delete plan
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.plan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true, invoices: true } } },
    })

    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    if (existing._count.subscriptions > 0 || existing._count.invoices > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete plan with active subscriptions or invoices. Archive it instead.",
        },
        { status: 409 }
      )
    }

    // Delete policy group links first
    await db.planPolicyGroup.deleteMany({ where: { planId: id } })
    // Delete the plan
    await db.plan.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting plan:", error)
    return NextResponse.json(
      { error: "Failed to delete plan" },
      { status: 500 }
    )
  }
}
