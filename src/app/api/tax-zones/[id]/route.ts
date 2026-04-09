import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// PUT /api/tax-zones/[id] — update a tax zone
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, country, state, city, taxRateIds, isDefault, status } = body

    if (isDefault) {
      await db.taxZone.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }

    const zone = await db.taxZone.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(country !== undefined && { country: country || null }),
        ...(state !== undefined && { state: state || null }),
        ...(city !== undefined && { city: city || null }),
        ...(taxRateIds !== undefined && {
          taxRateIds: Array.isArray(taxRateIds) ? JSON.stringify(taxRateIds) : taxRateIds,
        }),
        ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
        ...(status !== undefined && { status }),
      },
    })

    return NextResponse.json(zone)
  } catch (error) {
    console.error("Error updating tax zone:", error)
    return NextResponse.json({ error: "Failed to update tax zone" }, { status: 500 })
  }
}

// DELETE /api/tax-zones/[id] — delete a tax zone
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.taxZone.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting tax zone:", error)
    return NextResponse.json({ error: "Failed to delete tax zone" }, { status: 500 })
  }
}
