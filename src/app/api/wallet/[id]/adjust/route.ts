import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// POST /api/wallet/[id]/adjust — manual balance adjustment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { amount, reason, performedBy } = body

    if (!amount || parseFloat(amount) === 0) {
      return NextResponse.json({ error: "Non-zero amount is required" }, { status: 400 })
    }

    const wallet = await db.wallet.findUnique({ where: { id } })
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    const adjustAmount = parseFloat(amount)
    const balanceBefore = wallet.balance
    const balanceAfter = balanceBefore + adjustAmount

    if (balanceAfter < 0 && Math.abs(balanceAfter) > wallet.creditLimit) {
      return NextResponse.json(
        { error: "Adjustment exceeds credit limit" },
        { status: 400 }
      )
    }

    const [updatedWallet] = await db.$transaction([
      db.wallet.update({
        where: { id },
        data: { balance: balanceAfter },
      }),
      db.walletTransaction.create({
        data: {
          walletId: id,
          username: wallet.username,
          type: "adjustment",
          amount: adjustAmount,
          balanceBefore,
          balanceAfter,
          description: reason || "Manual adjustment",
          method: "admin_adjustment",
          performedBy: performedBy || null,
        },
      }),
    ])

    return NextResponse.json(updatedWallet)
  } catch (error) {
    console.error("Error adjusting wallet:", error)
    return NextResponse.json({ error: "Failed to adjust wallet" }, { status: 500 })
  }
}
