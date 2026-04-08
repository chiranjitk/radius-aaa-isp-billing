import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// POST /api/resellers/[id]/topup — topup reseller balance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { amount, description, performedBy } = body

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "Valid positive amount is required" },
        { status: 400 }
      )
    }

    const reseller = await db.reseller.findUnique({ where: { id } })
    if (!reseller) {
      return NextResponse.json({ error: "Reseller not found" }, { status: 404 })
    }

    if (reseller.status === "disabled" || reseller.status === "suspended") {
      return NextResponse.json(
        { error: "Cannot topup a disabled or suspended reseller" },
        { status: 400 }
      )
    }

    const topupAmount = parseFloat(amount)
    const balanceBefore = reseller.balance
    const balanceAfter = balanceBefore + topupAmount

    // Create transaction record
    const transaction = await db.resellerTransaction.create({
      data: {
        resellerId: id,
        type: "topup",
        amount: topupAmount,
        balanceBefore,
        balanceAfter,
        description: description || `Balance topup of $${topupAmount.toFixed(2)}`,
        performedBy: performedBy || null,
      },
    })

    // Update reseller balance
    const updatedReseller = await db.reseller.update({
      where: { id },
      data: { balance: balanceAfter },
      include: {
        _count: {
          select: { commissions: true, transactions: true },
        },
      },
    })

    return NextResponse.json({
      reseller: updatedReseller,
      transaction,
    })
  } catch (error) {
    console.error("Error topping up reseller:", error)
    return NextResponse.json(
      { error: "Failed to topup reseller balance" },
      { status: 500 }
    )
  }
}
