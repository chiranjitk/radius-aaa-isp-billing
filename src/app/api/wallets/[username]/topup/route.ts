import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// POST /api/wallets/[username]/topup — topup a wallet by username
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const body = await request.json()
    const { amount, method, performedBy, description } = body

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Valid positive amount is required" }, { status: 400 })
    }

    const wallet = await db.wallet.findUnique({ where: { username } })
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    const topupAmount = parseFloat(amount)
    const balanceBefore = wallet.balance
    const balanceAfter = balanceBefore + topupAmount

    // Update wallet and create transaction in a single transaction
    const [updatedWallet] = await db.$transaction([
      db.wallet.update({
        where: { username },
        data: {
          balance: balanceAfter,
          totalTopup: { increment: topupAmount },
        },
      }),
      db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          username: wallet.username,
          type: "topup",
          amount: topupAmount,
          balanceBefore,
          balanceAfter,
          description: description || `Topup via ${method || "cash"}`,
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
