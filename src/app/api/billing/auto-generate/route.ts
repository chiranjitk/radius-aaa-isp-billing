import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// POST /api/billing/auto-generate — Auto-generate invoices for subscriptions due within 7 days
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planId, cycle } = body || {}

    // Build where clause for subscriptions
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const subscriptionWhere: Prisma.SubscriptionWhereInput = {
      status: 'active',
      autoRenew: true,
      nextBilling: {
        lte: sevenDaysFromNow,
      },
    }

    // If specific planId provided, filter by plan
    if (planId) {
      subscriptionWhere.planId = planId
    }

    // If specific cycle provided, filter plans by billingCycle
    if (cycle) {
      subscriptionWhere.plan = {
        billingCycle: cycle,
      }
    }

    // Find qualifying subscriptions
    const subscriptions = await db.subscription.findMany({
      where: subscriptionWhere,
      include: {
        plan: true,
        user: {
          select: {
            fullName: true,
          },
        },
      },
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        generated: 0,
        details: [],
        message: 'No subscriptions due within the next 7 days.',
      })
    }

    // Get current invoice count for sequential numbering
    const currentCount = await db.invoice.count()
    const details: { planName: string; invoiceNo: string; amount: number }[] = []
    let generatedCount = 0

    for (const sub of subscriptions) {
      try {
        const invoiceNo = `INV-${String(currentCount + generatedCount + 1).padStart(5, '0')}`
        const amount = sub.plan.price
        const taxRate = 10
        const tax = amount * (taxRate / 100)
        const total = amount + tax

        // Calculate next billing date based on plan cycle
        const nextBillingDate = new Date(now.getTime())
        if (sub.plan.billingCycle === 'daily') {
          nextBillingDate.setDate(nextBillingDate.getDate() + 1)
        } else if (sub.plan.billingCycle === 'weekly') {
          nextBillingDate.setDate(nextBillingDate.getDate() + 7)
        } else if (sub.plan.billingCycle === 'monthly') {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
        } else if (sub.plan.billingCycle === 'yearly') {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
        }

        // Due date: 30 days from now
        const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        // Create invoice
        await db.invoice.create({
          data: {
            invoiceNo,
            username: sub.username,
            planId: sub.plan.id,
            subscriptionId: sub.id,
            amount,
            tax: Math.round(tax * 100) / 100,
            total: Math.round(total * 100) / 100,
            status: 'pending',
            dueDate,
            notes: `Auto-generated for ${sub.plan.name} (${sub.plan.billingCycle}) subscription renewal.`,
          },
        })

        // Update subscription nextBilling
        await db.subscription.update({
          where: { id: sub.id },
          data: {
            nextBilling: nextBillingDate,
          },
        })

        // Create audit log
        await db.auditLog.create({
          data: {
            action: 'create',
            module: 'billing',
            username: sub.username,
            details: `Auto-generated invoice ${invoiceNo} for plan "${sub.plan.name}" (${sub.plan.billingCycle}) - $${total.toFixed(2)}`,
          },
        })

        details.push({
          planName: sub.plan.name,
          invoiceNo,
          amount: total,
        })

        generatedCount++
      } catch (err) {
        console.error(`Failed to generate invoice for subscription ${sub.id}:`, err)
      }
    }

    // Create a summary audit log
    await db.auditLog.create({
      data: {
        action: 'create',
        module: 'billing',
        details: `Auto-generated ${generatedCount} invoices for subscriptions due within 7 days.`,
      },
    })

    return NextResponse.json({
      success: true,
      generated: generatedCount,
      details,
    })
  } catch (error) {
    console.error('Error auto-generating invoices:', error)
    return NextResponse.json(
      { error: 'Failed to auto-generate invoices' },
      { status: 500 }
    )
  }
}
