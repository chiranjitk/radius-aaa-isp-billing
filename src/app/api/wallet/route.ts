import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

// GET /api/wallet — list all wallets with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""

    const where: Prisma.WalletWhereInput = {}

    if (search) {
      where.OR = [{ username: { contains: search } }]
    }
    if (status) {
      where.status = status
    }

    const wallets = await db.wallet.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    // Aggregate stats
    const aggResult = await db.wallet.aggregate({
      _sum: { balance: true, totalTopup: true, totalSpent: true },
      _count: { id: true },
    })

    const stats = {
      totalWallets: aggResult._count.id,
      totalBalance: aggResult._sum.balance || 0,
      totalTopup: aggResult._sum.totalTopup || 0,
      totalSpent: aggResult._sum.totalSpent || 0,
    }

    return NextResponse.json({ wallets, stats })
  } catch (error) {
    console.error("Error fetching wallets:", error)
    return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 })
  }
}

// POST /api/wallet — create a wallet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, creditLimit, lowBalanceAlert, autoTopup, autoTopupAmount } = body

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Check if wallet already exists
    const existing = await db.wallet.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: "Wallet already exists for this user" }, { status: 409 })
    }

    const wallet = await db.wallet.create({
      data: {
        username,
        balance: 0,
        creditLimit: parseFloat(creditLimit) || 0,
        lowBalanceAlert: parseFloat(lowBalanceAlert) || 10,
        autoTopup: Boolean(autoTopup),
        autoTopupAmount: parseFloat(autoTopupAmount) || 0,
        status: "active",
      },
    })

    return NextResponse.json(wallet, { status: 201 })
  } catch (error) {
    console.error("Error creating wallet:", error)
    return NextResponse.json({ error: "Failed to create wallet" }, { status: 500 })
  }
}
