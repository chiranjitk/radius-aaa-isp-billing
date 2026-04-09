import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// PUT /api/wallets/[username] — update wallet settings or status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const body = await request.json()
    const { status, creditLimit, lowBalanceAlert, autoTopup, autoTopupAmount } = body

    const wallet = await db.wallet.findUnique({ where: { username } })
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    const updated = await db.wallet.update({
      where: { username },
      data: {
        ...(status !== undefined && { status }),
        ...(creditLimit !== undefined && { creditLimit: parseFloat(creditLimit) || 0 }),
        ...(lowBalanceAlert !== undefined && { lowBalanceAlert: parseFloat(lowBalanceAlert) || 10 }),
        ...(autoTopup !== undefined && { autoTopup: Boolean(autoTopup) }),
        ...(autoTopupAmount !== undefined && { autoTopupAmount: parseFloat(autoTopupAmount) || 0 }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating wallet:", error)
    return NextResponse.json({ error: "Failed to update wallet" }, { status: 500 })
  }
}

// DELETE /api/wallets/[username] — delete wallet and its transactions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    const wallet = await db.wallet.findUnique({ where: { username } })
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // Delete transactions first, then wallet
    await db.walletTransaction.deleteMany({ where: { walletId: wallet.id } })
    await db.wallet.delete({ where: { username } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting wallet:", error)
    return NextResponse.json({ error: "Failed to delete wallet" }, { status: 500 })
  }
}
