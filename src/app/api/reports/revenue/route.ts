import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/reports/revenue?period=daily|weekly|monthly&dateFrom=...&dateTo=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'monthly'
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Prisma.InvoiceWhereInput = {}
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z')
    }

    // Fetch all invoices in range
    const invoices = await db.invoice.findMany({
      where,
      select: {
        id: true, total: true, amount: true, taxAmount: true, discountAmount: true,
        lateFee: true, status: true, createdAt: true, planId: true, username: true,
      },
    })

    // Revenue by time period
    const revenueMap = new Map<string, { revenue: number; tax: number; discounts: number; lateFees: number; count: number }>()
    for (const inv of invoices) {
      let key: string
      const d = new Date(inv.createdAt)
      if (period === 'daily') {
        key = d.toISOString().split('T')[0]
      } else if (period === 'weekly') {
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(d)
        monday.setDate(diff)
        key = monday.toISOString().split('T')[0]
      } else {
        key = d.toISOString().slice(0, 7)
      }
      const cur = revenueMap.get(key) || { revenue: 0, tax: 0, discounts: 0, lateFees: 0, count: 0 }
      if (inv.status === 'paid') {
        cur.revenue += inv.total
        cur.tax += inv.taxAmount
        cur.discounts += inv.discountAmount
        cur.lateFees += inv.lateFee
      }
      cur.count += 1
      revenueMap.set(key, cur)
    }

    const revenueTrend = Array.from(revenueMap.entries())
      .map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        tax: Math.round(data.tax * 100) / 100,
        discounts: Math.round(data.discounts * 100) / 100,
        lateFees: Math.round(data.lateFees * 100) / 100,
        invoiceCount: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // MRR (Monthly Recurring Revenue) — from active subscriptions
    const activeSubs = await db.subscription.findMany({
      where: { status: 'active' },
      include: { plan: { select: { price: true, billingCycle: true } } },
    })

    let mrr = 0
    for (const sub of activeSubs) {
      const price = sub.plan.price
      switch (sub.plan.billingCycle) {
        case 'monthly': mrr += price; break
        case 'weekly': mrr += price * 4.33; break
        case 'daily': mrr += price * 30; break
        case 'yearly': mrr += price / 12; break
      }
    }
    mrr = Math.round(mrr * 100) / 100

    // ARPU (Average Revenue Per User)
    const paidInvoices = invoices.filter((i) => i.status === 'paid')
    const uniqueUsers = new Set(paidInvoices.map((i) => i.username))
    const arpu = uniqueUsers.size > 0 ? Math.round((paidInvoices.reduce((s, i) => s + i.total, 0) / uniqueUsers.size) * 100) / 100 : 0

    // Churn rate (cancelled subscriptions in last 30 days vs total active)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cancelledLast30 = await db.subscription.count({
      where: { status: 'cancelled', canceledAt: { gte: thirtyDaysAgo } },
    })
    const totalActiveStart = activeSubs.length + cancelledLast30
    const churnRate = totalActiveStart > 0 ? Math.round((cancelledLast30 / totalActiveStart) * 10000) / 100 : 0

    // Revenue by plan
    const plans = await db.plan.findMany({ select: { id: true, name: true } })
    const planRevenueMap = new Map<string, number>()
    for (const inv of paidInvoices) {
      if (!inv.planId) continue
      const plan = plans.find((p) => p.id === inv.planId)
      const name = plan?.name || 'Unknown'
      planRevenueMap.set(name, (planRevenueMap.get(name) || 0) + inv.total)
    }
    const revenueByPlan = Array.from(planRevenueMap.entries())
      .map(([plan, revenue]) => ({ plan, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)

    // Summary
    const totalRevenue = paidInvoices.reduce((s, i) => s + i.total, 0)
    const totalTax = paidInvoices.reduce((s, i) => s + i.taxAmount, 0)
    const totalPending = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.total, 0)
    const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total, 0)

    return NextResponse.json({
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
        totalOverdue: Math.round(totalOverdue * 100) / 100,
        paidCount: paidInvoices.length,
        mrr,
        arpu,
        churnRate,
        activeSubscriptions: activeSubs.length,
      },
      revenueTrend,
      revenueByPlan,
    })
  } catch (error) {
    console.error('Revenue report error:', error)
    return NextResponse.json({ error: 'Failed to generate revenue report' }, { status: 500 })
  }
}
