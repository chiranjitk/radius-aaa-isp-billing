import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// PUT /api/tax/[id] — update a tax rate
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, rate, type, status, isCompound, priority } = body

    const taxRate = await db.taxRate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(rate !== undefined && { rate: parseFloat(rate) || 0 }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(isCompound !== undefined && { isCompound: Boolean(isCompound) }),
        ...(priority !== undefined && { priority: parseInt(priority, 10) || 0 }),
      },
    })

    return NextResponse.json(taxRate)
  } catch (error) {
    console.error("Error updating tax rate:", error)
    return NextResponse.json({ error: "Failed to update tax rate" }, { status: 500 })
  }
}

// DELETE /api/tax/[id] — delete a tax rate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await db.taxRate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting tax rate:", error)
    return NextResponse.json({ error: "Failed to delete tax rate" }, { status: 500 })
  }
}
