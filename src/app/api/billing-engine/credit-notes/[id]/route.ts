import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/billing-engine/credit-notes/[id] — Get single credit note
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const creditNote = await db.creditNote.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, fullName: true, email: true } },
      },
    })

    if (!creditNote) {
      return NextResponse.json({ error: 'Credit note not found' }, { status: 404 })
    }

    return NextResponse.json(creditNote)
  } catch (error) {
    console.error('Error fetching credit note:', error)
    return NextResponse.json({ error: 'Failed to fetch credit note' }, { status: 500 })
  }
}

// PUT /api/billing-engine/credit-notes/[id] — Update credit note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { amount, reason, status, invoiceId, expiresAt, usedAmount } = body

    // Check credit note exists
    const existing = await db.creditNote.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Credit note not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (amount !== undefined) updateData.amount = parseFloat(amount)
    if (reason) updateData.reason = reason
    if (status) updateData.status = status
    if (invoiceId !== undefined) updateData.invoiceId = invoiceId || null
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    if (usedAmount !== undefined) updateData.usedAmount = parseFloat(usedAmount)

    const creditNote = await db.creditNote.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, fullName: true, email: true } },
      },
    })

    return NextResponse.json(creditNote)
  } catch (error) {
    console.error('Error updating credit note:', error)
    return NextResponse.json({ error: 'Failed to update credit note' }, { status: 500 })
  }
}

// DELETE /api/billing-engine/credit-notes/[id] — Delete credit note
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.creditNote.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Credit note not found' }, { status: 404 })
    }

    // Only allow deletion of active credit notes that haven't been used
    if (existing.status === 'used') {
      return NextResponse.json(
        { error: 'Cannot delete a credit note that has been partially or fully used' },
        { status: 400 }
      )
    }

    await db.creditNote.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Credit note deleted' })
  } catch (error) {
    console.error('Error deleting credit note:', error)
    return NextResponse.json({ error: 'Failed to delete credit note' }, { status: 500 })
  }
}
