import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/policies/[id] - Get a single policy with rules and linked plans
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const policy = await db.policy.findUnique({
      where: { id },
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
                description: true,
                planType: true,
                status: true,
                price: true,
              },
            },
          },
        },
      },
    })

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ policy })
  } catch (error) {
    console.error('Error fetching policy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policy' },
      { status: 500 }
    )
  }
}

// PUT /api/policies/[id] - Update a policy and its rules
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, type, priority, status, rules } = body

    const existing = await db.policy.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      )
    }

    // Update policy with rules in a transaction
    const updatedPolicy = await db.$transaction(async (tx) => {
      // Update basic policy fields
      const policy = await tx.policy.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(type !== undefined && { type }),
          ...(priority !== undefined && { priority }),
          ...(status !== undefined && { status }),
        },
        include: {
          rules: {
            orderBy: { priority: 'desc' },
          },
        },
      })

      // If rules are provided, replace all rules
      if (rules !== undefined) {
        // Delete existing rules
        await tx.policyRule.deleteMany({ where: { policyId: id } })

        // Create new rules
        if (rules.length > 0) {
          await tx.policyRule.createMany({
            data: rules.map((rule: {
              name: string
              attribute: string
              operator: string
              value: string
              description?: string
              priority?: number
            }) => ({
              policyId: id,
              name: rule.name,
              attribute: rule.attribute,
              operator: rule.operator || '=',
              value: rule.value,
              description: rule.description || null,
              priority: rule.priority ?? 0,
            })),
          })
        }

        // Return updated policy with new rules
        return tx.policy.findUnique({
          where: { id },
          include: {
            rules: {
              orderBy: { priority: 'desc' },
            },
          },
        })
      }

      return policy
    })

    return NextResponse.json({ policy: updatedPolicy })
  } catch (error) {
    console.error('Error updating policy:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A policy with this name already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update policy' },
      { status: 500 }
    )
  }
}

// DELETE /api/policies/[id] - Delete a policy and its rules
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.policy.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            planGroups: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      )
    }

    // Delete policy and related records in a transaction
    await db.$transaction(async (tx) => {
      // Delete plan-policy group associations
      await tx.planPolicyGroup.deleteMany({ where: { policyId: id } })
      // Delete policy rules
      await tx.policyRule.deleteMany({ where: { policyId: id } })
      // Delete the policy
      await tx.policy.delete({ where: { id } })
    })

    return NextResponse.json({
      message: 'Policy deleted successfully',
      linkedPlans: existing._count.planGroups,
    })
  } catch (error) {
    console.error('Error deleting policy:', error)
    return NextResponse.json(
      { error: 'Failed to delete policy' },
      { status: 500 }
    )
  }
}
