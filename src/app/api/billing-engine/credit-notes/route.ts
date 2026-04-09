import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/billing-engine/credit-notes — List credit notes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

    const where: Prisma.CreditNoteWhereInput = {}

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { creditNo: { contains: search } },
        { reason: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    const [creditNotes, total] = await Promise.all([
      db.creditNote.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.creditNote.count({ where }),
    ])

    return NextResponse.json({
      creditNotes,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Error fetching credit notes:', error)
    return NextResponse.json({ error: 'Failed to fetch credit notes' }, { status: 500 })
  }
}

// POST /api/billing-engine/credit-notes — Create credit note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, amount, reason, invoiceId, expiresAt, issuedBy } = body

    if (!username || amount === undefined || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: username, amount, reason' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }

    // Validate user exists
    const user = await db.radUser.findUnique({ where: { username } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Validate linked invoice if provided
    if (invoiceId) {
      const invoice = await db.invoice.findUnique({ where: { id: invoiceId } })
      if (!invoice) {
        return NextResponse.json({ error: 'Linked invoice not found' }, { status: 404 })
      }
    }

    // Generate credit note number
    const count = await db.creditNote.count()
    const creditNo = `CN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

    const creditNote = await db.creditNote.create({
      data: {
        creditNo,
        username,
        amount: parseFloat(amount),
        reason,
        invoiceId: invoiceId || null,
        issuedBy: issuedBy || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'active',
      },
      include: {
        user: { select: { id: true, username: true, fullName: true, email: true } },
      },
    })

    return NextResponse.json(creditNote, { status: 201 })
  } catch (error) {
    console.error('Error creating credit note:', error)
    return NextResponse.json({ error: 'Failed to create credit note' }, { status: 500 })
  }
}
