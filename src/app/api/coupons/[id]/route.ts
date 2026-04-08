import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// PUT /api/coupons/[id] — update a coupon
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      code,
      name,
      description,
      discountType,
      discountValue,
      freeTrialDays,
      maxUses,
      minOrderAmount,
      maxDiscount,
      applicablePlans,
      startDate,
      expiresAt,
      status,
    } = body

    // If code is being changed, check for duplicates
    if (code) {
      const existing = await db.coupon.findFirst({
        where: { code: code.trim().toUpperCase(), id: { not: id } },
      })
      if (existing) {
        return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 })
      }
    }

    const coupon = await db.coupon.update({
      where: { id },
      data: {
        ...(code !== undefined && { code: code.trim().toUpperCase() }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(discountType !== undefined && { discountType }),
        ...(discountValue !== undefined && { discountValue: parseFloat(discountValue) || 0 }),
        ...(freeTrialDays !== undefined && {
          freeTrialDays: freeTrialDays ? parseInt(freeTrialDays, 10) : null,
        }),
        ...(maxUses !== undefined && {
          maxUses: maxUses ? parseInt(maxUses, 10) : null,
        }),
        ...(minOrderAmount !== undefined && {
          minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        }),
        ...(maxDiscount !== undefined && {
          maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        }),
        ...(applicablePlans !== undefined && {
          applicablePlans: Array.isArray(applicablePlans) ? JSON.stringify(applicablePlans) : applicablePlans,
        }),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(expiresAt !== undefined && {
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        }),
        ...(status !== undefined && { status }),
      },
    })

    return NextResponse.json(coupon)
  } catch (error) {
    console.error("Error updating coupon:", error)
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 })
  }
}

// DELETE /api/coupons/[id] — delete a coupon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Delete related usages first
    await db.couponUsage.deleteMany({ where: { couponId: id } })
    await db.coupon.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting coupon:", error)
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 })
  }
}
