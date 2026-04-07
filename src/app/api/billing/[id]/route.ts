import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/billing/[id] — Get invoice with payments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, fullName: true, email: true, phone: true, company: true, address: true } },
        plan: { select: { id: true, name: true, price: true, billingCycle: true } },
        subscription: { select: { id: true, status: true, startDate: true, expiryDate: true } },
        payments: {
          orderBy: { paidAt: 'desc' },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}

// PUT /api/billing/[id] — Update invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const invoice = await db.invoice.findUnique({ where: { id } })
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = ['amount', 'tax', 'total', 'status', 'dueDate', 'paidDate', 'notes', 'planId', 'subscriptionId']

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'dueDate' || field === 'paidDate') {
          updateData[field] = body[field] ? new Date(body[field]) : null
        } else if (field === 'amount' || field === 'tax' || field === 'total') {
          updateData[field] = parseFloat(body[field])
        } else {
          updateData[field] = body[field]
        }
      }
    }

    const updated = await db.invoice.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, fullName: true, email: true } },
        plan: { select: { id: true, name: true } },
        subscription: { select: { id: true } },
        payments: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

// DELETE /api/billing/[id] — Delete invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const invoice = await db.invoice.findUnique({ where: { id } })
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Delete payments first
    await db.payment.deleteMany({ where: { invoiceId: id } })
    await db.invoice.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}

// POST /api/billing/[id] — Record payment for invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { amount, method, gateway, transactionId } = body

    if (!amount || !method) {
      return NextResponse.json({ error: 'Missing required fields: amount, method' }, { status: 400 })
    }

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { payments: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Generate payment number
    const count = await db.payment.count()
    const paymentNo = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`

    const payment = await db.payment.create({
      data: {
        paymentNo,
        username: invoice.username,
        invoiceId: id,
        amount: parseFloat(amount),
        method,
        gateway: gateway || null,
        transactionId: transactionId || null,
        status: 'completed',
        paidAt: new Date(),
      },
    })

    // Recalculate total paid and update invoice status
    const totalPaid = invoice.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0) + parseFloat(amount)

    let newStatus = invoice.status
    if (totalPaid >= invoice.total) {
      newStatus = 'paid'
    } else if (totalPaid > 0) {
      newStatus = 'pending'
    }

    await db.invoice.update({
      where: { id },
      data: {
        status: newStatus,
        paidDate: newStatus === 'paid' ? new Date() : invoice.paidDate,
      },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
}
