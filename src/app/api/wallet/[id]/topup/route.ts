import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// POST /api/wallet/[id]/topup — topup wallet balance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { amount, method, performedBy, description } = body

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Valid positive amount is required" }, { status: 400 })
    }

    const wallet = await db.wallet.findUnique({ where: { id } })
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    const topupAmount = parseFloat(amount)
    const balanceBefore = wallet.balance
    const balanceAfter = balanceBefore + topupAmount

    // Update wallet and create transaction
    const [updatedWallet] = await db.$transaction([
      db.wallet.update({
        where: { id },
        data: {
          balance: balanceAfter,
          totalTopup: { increment: topupAmount },
        },
      }),
      db.walletTransaction.create({
        data: {
          walletId: id,
          username: wallet.username,
          type: "topup",
          amount: topupAmount,
          balanceBefore,
          balanceAfter,
          description: description || `Topup ${method || ''}`,
          method: method || "cash",
          performedBy: performedBy || null,
        },
      }),
    ])

    return NextResponse.json(updatedWallet)
  } catch (error) {
    console.error("Error topping up wallet:", error)
    return NextResponse.json({ error: "Failed to topup wallet" }, { status: 500 })
  }
}
