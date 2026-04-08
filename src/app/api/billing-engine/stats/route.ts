import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/billing-engine/stats — Billing engine statistics
export async function GET() {
  try {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Parallel queries for stats
    const [
      totalSubscriptions,
      activeSubscriptions,
      overdueInvoices,
      autoInvoicesThisMonth,
      revenueThisMonthRaw,
      activePlans,
      monthlyRevenueData,
    ] = await Promise.all([
      // Total subscriptions
      db.subscription.count(),

      // Active subscriptions
      db.subscription.count({ where: { status: 'active' } }),

      // Overdue invoices
      db.invoice.count({ where: { status: 'overdue' } }),

      // Auto-invoiced this month (invoices created this month with auto-generated numbering)
      db.invoice.count({
        where: {
          createdAt: { gte: thisMonthStart, lt: nextMonthStart },
        },
      }),

      // Revenue this month (paid invoices this month)
      db.invoice.aggregate({
        where: {
          status: 'paid',
          paidDate: { gte: thisMonthStart, lt: nextMonthStart },
        },
        _sum: { total: true },
      }),

      // Active plans with their prices (for MRR)
      db.plan.findMany({
        where: { isActive: true, status: 'active' },
        select: { id: true, price: true },
      }),

      // Monthly revenue data for last 12 months
      db.invoice.groupBy({
        by: ['paidDate'],
        where: {
          status: 'paid',
          paidDate: {
            gte: new Date(now.getFullYear(), now.getMonth() - 11, 1),
            lt: nextMonthStart,
          },
        },
        _sum: { total: true },
      }),
    ])

    const revenueThisMonth = revenueThisMonthRaw._sum.total ?? 0

    // Calculate MRR from active subscriptions × plan prices
    const activeSubs = await db.subscription.findMany({
      where: { status: 'active' },
      select: { planId: true },
    })

    const planPriceMap: Record<string, number> = {}
    for (const plan of activePlans) {
      // Normalize monthly price based on billing cycle
      planPriceMap[plan.id] = plan.price
    }

    let mrr = 0
    for (const sub of activeSubs) {
      mrr += planPriceMap[sub.planId] ?? 0
    }

    // Aggregate monthly revenue by month for chart
    const monthlyRevenue: { month: string; revenue: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

      let monthRevenue = 0
      for (const inv of monthlyRevenueData) {
        if (inv.paidDate && inv.paidDate >= monthDate && inv.paidDate < monthEnd) {
          monthRevenue += inv._sum.total ?? 0
        }
      }

      monthlyRevenue.push({ month: monthLabel, revenue: Math.round(monthRevenue * 100) / 100 })
    }

    // Credit notes summary
    const [totalCreditNotes, activeCreditNotes] = await Promise.all([
      db.creditNote.count(),
      db.creditNote.count({ where: { status: 'active' } }),
    ])

    const creditNotesTotal = await db.creditNote.aggregate({
      where: { status: 'active' },
      _sum: { amount: true },
    })

    return NextResponse.json({
      totalSubscriptions,
      activeSubscriptions,
      overdueInvoices,
      autoInvoicesThisMonth,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      mrr: Math.round(mrr * 100) / 100,
      totalCreditNotes,
      activeCreditNotes,
      activeCreditTotal: creditNotesTotal._sum.amount ?? 0,
      monthlyRevenue,
    })
  } catch (error) {
    console.error('Error fetching billing engine stats:', error)
    return NextResponse.json({ error: 'Failed to fetch billing stats' }, { status: 500 })
  }
}
