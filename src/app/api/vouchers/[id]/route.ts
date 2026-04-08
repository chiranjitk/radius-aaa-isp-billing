import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/vouchers/[id] - Update a voucher
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.voucher.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Voucher not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      status,
      expiresAt,
      speedDown,
      speedUp,
      locationId,
      type,
      value,
      simultaneous,
      macAddress,
    } = body

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    if (speedDown !== undefined) updateData.speedDown = speedDown ? parseInt(speedDown) : null
    if (speedUp !== undefined) updateData.speedUp = speedUp ? parseInt(speedUp) : null
    if (locationId !== undefined) updateData.locationId = locationId || null
    if (type !== undefined) updateData.type = type
    if (value !== undefined) updateData.value = parseInt(value) || 0
    if (simultaneous !== undefined) updateData.simultaneous = parseInt(simultaneous) || 1
    if (macAddress !== undefined) updateData.macAddress = macAddress?.trim() || null

    const updated = await db.voucher.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ voucher: updated })
  } catch (error) {
    console.error('Error updating voucher:', error)
    return NextResponse.json(
      { error: 'Failed to update voucher' },
      { status: 500 }
    )
  }
}

// DELETE /api/vouchers/[id] - Delete a voucher
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.voucher.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Voucher not found' },
        { status: 404 }
      )
    }

    await db.voucher.delete({ where: { id } })

    return NextResponse.json({
      message: 'Voucher deleted successfully',
      voucherId: id,
    })
  } catch (error) {
    console.error('Error deleting voucher:', error)
    return NextResponse.json(
      { error: 'Failed to delete voucher' },
      { status: 500 }
    )
  }
}
