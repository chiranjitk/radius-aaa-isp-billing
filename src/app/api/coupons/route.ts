import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

// GET /api/coupons — list all coupons with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const discountType = searchParams.get("discountType") || ""

    const where: Prisma.CouponWhereInput = {}

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
      ]
    }
    if (status) {
      where.status = status
    }
    if (discountType) {
      where.discountType = discountType
    }

    const coupons = await db.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    // Aggregate stats
    const aggResult = await db.coupon.aggregate({
      _count: { id: true },
      _sum: { usedCount: true },
    })

    const activeCoupons = await db.coupon.count({ where: { status: "active" } })
    const redeemedCoupons = await db.coupon.count({
      where: { usedCount: { gt: 0 } },
    })

    // Total discount given from coupon usages
    const discountResult = await db.couponUsage.aggregate({
      _sum: { discountGiven: true },
    })

    const stats = {
      totalCoupons: aggResult._count.id,
      activeCoupons,
      redeemedCoupons,
      totalDiscountGiven: discountResult._sum.discountGiven || 0,
      totalUses: aggResult._sum.usedCount || 0,
    }

    return NextResponse.json({ coupons, stats })
  } catch (error) {
    console.error("Error fetching coupons:", error)
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 })
  }
}

// POST /api/coupons — create a coupon
export async function POST(request: NextRequest) {
  try {
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
    } = body

    if (!code || !name || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: "Code, name, discountType, and discountValue are required" },
        { status: 400 }
      )
    }

    // Check for duplicate code
    const existing = await db.coupon.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 })
    }

    const coupon = await db.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        name,
        description: description || null,
        discountType,
        discountValue: parseFloat(discountValue) || 0,
        freeTrialDays: freeTrialDays ? parseInt(freeTrialDays, 10) : null,
        maxUses: maxUses ? parseInt(maxUses, 10) : null,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        applicablePlans: Array.isArray(applicablePlans) ? JSON.stringify(applicablePlans) : null,
        startDate: startDate ? new Date(startDate) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: "active",
      },
    })

    return NextResponse.json(coupon, { status: 201 })
  } catch (error) {
    console.error("Error creating coupon:", error)
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 })
  }
}
