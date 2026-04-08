import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

// GET /api/wallet/[id]/transactions — get wallet transactions by wallet id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || ""
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10))

    const wallet = await db.wallet.findUnique({ where: { id } })
    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    const where: Prisma.WalletTransactionWhereInput = { walletId: wallet.id }
    if (type) {
      where.type = type
    }

    const [transactions, total] = await Promise.all([
      db.walletTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.walletTransaction.count({ where }),
    ])

    return NextResponse.json({ transactions, wallet, total })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}
