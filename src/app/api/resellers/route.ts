import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

// GET /api/resellers — list resellers with search, filters, pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const level = searchParams.get("level") || ""
    const parentId = searchParams.get("parentId") || ""
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const where: Prisma.ResellerWhereInput = {}

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { email: { contains: search } },
        { company: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (level) {
      where.level = parseInt(level, 10)
    }

    if (parentId) {
      where.parentId = parentId
    }

    const [resellers, total] = await Promise.all([
      db.reseller.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ level: "asc" }, { createdAt: "desc" }],
        include: {
          _count: {
            select: { commissions: true, transactions: true },
          },
        },
      }),
      db.reseller.count({ where }),
    ])

    // Stats
    const [activeCount, totalCommission, totalRevenue] = await Promise.all([
      db.reseller.count({ where: { status: "active" } }),
      db.resellerCommission.aggregate({ _sum: { amount: true }, where: { status: "paid" } }),
      db.resellerTransaction.aggregate({ _sum: { amount: true }, where: { type: "deduction" } }),
    ])

    return NextResponse.json({
      resellers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        active: activeCount,
        totalCommissionPaid: totalCommission._sum.amount || 0,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
    })
  } catch (error) {
    console.error("Error fetching resellers:", error)
    return NextResponse.json(
      { error: "Failed to fetch resellers" },
      { status: 500 }
    )
  }
}

// POST /api/resellers — create a new reseller
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      username,
      password,
      fullName,
      email,
      phone,
      company,
      address,
      city,
      state,
      country,
      balance,
      commissionRate,
      creditLimit,
      parentId,
      level,
      status,
      logoUrl,
      primaryColor,
      customDomain,
      customEmail,
      maxUsers,
      maxNas,
      ipPoolIds,
    } = body

    if (!username || !password || !fullName || !email) {
      return NextResponse.json(
        { error: "Username, password, fullName, and email are required" },
        { status: 400 }
      )
    }

    // Check for duplicate username
    const existingUsername = await db.reseller.findUnique({ where: { username } })
    if (existingUsername) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }

    // Check for duplicate email
    const existingEmail = await db.reseller.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 })
    }

    // Validate parent
    if (parentId) {
      const parent = await db.reseller.findUnique({ where: { id: parentId } })
      if (!parent) {
        return NextResponse.json({ error: "Parent reseller not found" }, { status: 404 })
      }
    }

    const reseller = await db.reseller.create({
      data: {
        username,
        password,
        fullName,
        email,
        phone: phone || null,
        company: company || null,
        address: address || null,
        city: city || null,
        state: state || null,
        country: country || null,
        balance: parseFloat(balance) || 0,
        commissionRate: parseFloat(commissionRate) || 10,
        creditLimit: parseFloat(creditLimit) || 0,
        parentId: parentId || null,
        level: parseInt(level, 10) || (parentId ? 2 : 1),
        status: status || "active",
        logoUrl: logoUrl || null,
        primaryColor: primaryColor || null,
        customDomain: customDomain || null,
        customEmail: customEmail || null,
        maxUsers: maxUsers ? parseInt(maxUsers, 10) : null,
        maxNas: maxNas ? parseInt(maxNas, 10) : null,
        ipPoolIds: ipPoolIds || null,
      },
      include: {
        _count: {
          select: { commissions: true, transactions: true },
        },
      },
    })

    return NextResponse.json(reseller, { status: 201 })
  } catch (error) {
    console.error("Error creating reseller:", error)
    return NextResponse.json(
      { error: "Failed to create reseller" },
      { status: 500 }
    )
  }
}
