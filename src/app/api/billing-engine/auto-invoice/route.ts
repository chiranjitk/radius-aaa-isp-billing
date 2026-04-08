import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/billing-engine/auto-invoice — Generate invoices for active subscriptions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const advanceDays = parseInt(body.advanceDays || '3', 10)
    const emailInvoice = body.emailInvoice ?? false

    const now = new Date()
    const windowEnd = new Date(now.getTime() + advanceDays * 24 * 60 * 60 * 1000)

    // Find active subscriptions nearing next billing date (within advance days window)
    const subscriptions = await db.subscription.findMany({
      where: {
        status: 'active',
        autoRenew: true,
        nextBilling: {
          lte: windowEnd,
        },
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, email: true } },
        plan: { select: { id: true, name: true, price: true, billingCycle: true, gracePeriodDays: true, lateFeePercent: true } },
      },
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({
        generated: 0,
        totalAmount: 0,
        errors: [],
        message: 'No subscriptions due for invoicing in the specified window.',
      })
    }

    let generated = 0
    let totalAmount = 0
    const errors: { subscription: string; reason: string }[] = []

    for (const sub of subscriptions) {
      try {
        // Calculate due date (billing date + advance offset)
        const billingDate = sub.nextBilling || now
        const dueDate = new Date(billingDate.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days after billing

        // Grace period end
        const graceDays = sub.plan.gracePeriodDays || 0
        const gracePeriodEnd = new Date(dueDate.getTime() + graceDays * 24 * 60 * 60 * 1000)

        // Generate invoice number
        const count = await db.invoice.count()
        const invoiceNo = `INV-${now.getFullYear()}-${String(count + 1).padStart(4, '0')}`

        const amount = sub.plan.price
        const total = amount

        await db.invoice.create({
          data: {
            invoiceNo,
            username: sub.username,
            planId: sub.planId,
            subscriptionId: sub.id,
            amount,
            taxAmount: 0,
            discountAmount: 0,
            lateFee: 0,
            total,
            status: 'pending',
            dueDate,
            gracePeriodEnds: gracePeriodEnd,
            notes: `Auto-generated for ${sub.plan.name} - ${sub.plan.billingCycle} cycle`,
          },
        })

        // Update subscription next billing date
        const cycleDays: Record<string, number> = {
          daily: 1,
          weekly: 7,
          monthly: 30,
          yearly: 365,
        }
        const nextBilling = new Date(billingDate.getTime() + (cycleDays[sub.plan.billingCycle] || 30) * 24 * 60 * 60 * 1000)
        await db.subscription.update({
          where: { id: sub.id },
          data: { nextBilling },
        })

        generated++
        totalAmount += total
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push({ subscription: sub.username, reason: msg })
      }
    }

    return NextResponse.json({
      generated,
      totalAmount: Math.round(totalAmount * 100) / 100,
      errors,
      processedAt: now.toISOString(),
    })
  } catch (error) {
    console.error('Error generating auto invoices:', error)
    return NextResponse.json({ error: 'Failed to generate invoices' }, { status: 500 })
  }
}
