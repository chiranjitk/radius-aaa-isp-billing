import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/billing-engine/grace-period — Check and suspend expired accounts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const dryRun = body.dryRun ?? false

    const now = new Date()

    // Find overdue invoices past their grace period
    const overdueInvoices = await db.invoice.findMany({
      where: {
        status: 'overdue',
        gracePeriodEnds: {
          lt: now,
        },
      },
      include: {
        user: {
          select: { id: true, username: true, fullName: true, email: true, status: true },
        },
        plan: { select: { id: true, name: true, gracePeriodDays: true } },
        subscription: { select: { id: true, status: true } },
      },
      orderBy: { gracePeriodEnds: 'asc' },
    })

    if (overdueInvoices.length === 0) {
      return NextResponse.json({
        suspended: 0,
        warningsSent: 0,
        reviewed: 0,
        message: 'No overdue invoices past grace period found.',
      })
    }

    let suspended = 0
    let warningsSent = 0
    const reviewed = overdueInvoices.length
    const errors: { invoice: string; reason: string }[] = []

    for (const invoice of overdueInvoices) {
      try {
        if (dryRun) {
          // In dry run mode, just count what would happen
          if (invoice.user.status === 'active') {
            suspended++
          }
          warningsSent++
          continue
        }

        // Suspend the user if still active
        if (invoice.user.status === 'active') {
          await db.radUser.update({
            where: { username: invoice.username },
            data: { status: 'suspended' },
          })
          suspended++
        }

        // Suspend the subscription if active
        if (invoice.subscription && invoice.subscription.status === 'active') {
          await db.subscription.update({
            where: { id: invoice.subscription.id },
            data: { status: 'suspended' },
          })
        }

        // Increment reminder count
        await db.invoice.update({
          where: { id: invoice.id },
          data: {
            reminderCount: { increment: 1 },
            reminderSentAt: now,
          },
        })

        // Log notification (simulated — in production would send email/SMS)
        await db.notificationLog.create({
          data: {
            recipient: invoice.user.email || invoice.user.username,
            type: 'email',
            category: 'suspension',
            subject: `Account Suspended - Invoice ${invoice.invoiceNo} Overdue`,
            body: `Your account has been suspended due to overdue invoice ${invoice.invoiceNo}. Please contact support.`,
            status: 'sent',
            sentVia: 'smtp',
          },
        })

        warningsSent++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push({ invoice: invoice.invoiceNo, reason: msg })
      }
    }

    return NextResponse.json({
      suspended,
      warningsSent,
      reviewed,
      errors: errors.length > 0 ? errors : undefined,
      processedAt: now.toISOString(),
      mode: dryRun ? 'dry-run' : 'live',
    })
  } catch (error) {
    console.error('Error processing grace period:', error)
    return NextResponse.json({ error: 'Failed to process grace period' }, { status: 500 })
  }
}
