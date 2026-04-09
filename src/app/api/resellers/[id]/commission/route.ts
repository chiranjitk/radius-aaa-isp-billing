import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET /api/resellers/[id]/commission — get commission history for a reseller
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit
    const status = searchParams.get("status") || ""

    const reseller = await db.reseller.findUnique({ where: { id } })
    if (!reseller) {
      return NextResponse.json({ error: "Reseller not found" }, { status: 404 })
    }

    const where: Record<string, unknown> = { resellerId: id }
    if (status) {
      where.status = status
    }

    const [commissions, total] = await Promise.all([
      db.resellerCommission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.resellerCommission.count({ where }),
    ])

    // Aggregate stats
    const [pendingSum, paidSum] = await Promise.all([
      db.resellerCommission.aggregate({
        _sum: { amount: true },
        where: { resellerId: id, status: "pending" },
      }),
      db.resellerCommission.aggregate({
        _sum: { amount: true },
        where: { resellerId: id, status: "paid" },
      }),
    ])

    return NextResponse.json({
      commissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalPending: pendingSum._sum.amount || 0,
        totalPaid: paidSum._sum.amount || 0,
        commissionRate: reseller.commissionRate,
      },
    })
  } catch (error) {
    console.error("Error fetching commissions:", error)
    return NextResponse.json(
      { error: "Failed to fetch commission history" },
      { status: 500 }
    )
  }
}
