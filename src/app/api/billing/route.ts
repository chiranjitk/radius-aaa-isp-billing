import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/billing — List invoices with filters & pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)))

    const where: Prisma.InvoiceWhereInput = {}

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { invoiceNo: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.dueDate = {}
      if (dateFrom) where.dueDate.gte = new Date(dateFrom)
      if (dateTo) where.dueDate.lte = new Date(dateTo)
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, fullName: true, email: true } },
          plan: { select: { id: true, name: true } },
          subscription: { select: { id: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.invoice.count({ where }),
    ])

    // Summary stats
    const allInvoices = await db.invoice.findMany({
      select: { status: true, total: true, createdAt: true },
    })

    const totalRevenue = allInvoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0)

    const pendingAmount = allInvoices
      .filter((inv) => inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.total, 0)

    const overdueCount = allInvoices.filter((inv) => inv.status === 'overdue').length

    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const thisMonthCollections = allInvoices
      .filter(
        (inv) =>
          inv.status === 'paid' &&
          inv.createdAt.getMonth() === thisMonth &&
          inv.createdAt.getFullYear() === thisYear
      )
      .reduce((sum, inv) => sum + inv.total, 0)

    return NextResponse.json({
      invoices,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
      summary: {
        totalRevenue,
        pendingAmount,
        overdueCount,
        thisMonthCollections,
      },
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

// POST /api/billing — Create invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, planId, subscriptionId, amount, tax, total, dueDate, notes } = body
    const taxAmount = parseFloat(tax || 0)

    if (!username || amount === undefined || total === undefined || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate user exists
    const user = await db.radUser.findUnique({ where: { username } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate plan if provided
    if (planId) {
      const plan = await db.plan.findUnique({ where: { id: planId } })
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
      }
    }

    // Validate subscription if provided
    if (subscriptionId) {
      const sub = await db.subscription.findUnique({ where: { id: subscriptionId } })
      if (!sub) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      }
    }

    // Generate invoice number
    const count = await db.invoice.count()
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

    const invoice = await db.invoice.create({
      data: {
        invoiceNo,
        username,
        planId: planId || null,
        subscriptionId: subscriptionId || null,
        amount: parseFloat(amount),
        taxAmount,
        total: parseFloat(total),
        status: 'pending',
        dueDate: new Date(dueDate),
        notes: notes || null,
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, email: true } },
        plan: { select: { id: true, name: true } },
        subscription: { select: { id: true } },
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
  }
}
