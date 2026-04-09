import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

// GET /api/tax — list all tax rates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const type = searchParams.get("type") || ""

    const where: Prisma.TaxRateWhereInput = {}

    if (search) {
      where.OR = [{ name: { contains: search } }]
    }
    if (status) {
      where.status = status
    }
    if (type) {
      where.type = type
    }

    const taxRates = await db.taxRate.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    })

    const zones = await db.taxZone.findMany({
      orderBy: { createdAt: "desc" },
    })

    // Calculate tax collected this month (sum of taxAmount from invoices this month)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const invoiceTaxResult = await db.invoice.aggregate({
      _sum: { taxAmount: true },
      where: {
        status: { in: ["paid", "partial"] },
        paidDate: { gte: startOfMonth },
      },
    })

    const stats = {
      totalRates: taxRates.length,
      activeRates: taxRates.filter((r) => r.status === "active").length,
      totalZones: zones.length,
      activeZones: zones.filter((z) => z.status === "active").length,
      taxCollectedMonth: invoiceTaxResult._sum.taxAmount || 0,
    }

    return NextResponse.json({ taxRates, zones, stats })
  } catch (error) {
    console.error("Error fetching tax rates:", error)
    return NextResponse.json({ error: "Failed to fetch tax rates" }, { status: 500 })
  }
}

// POST /api/tax — create a new tax rate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, rate, type, isCompound, priority, description } = body

    if (!name || rate === undefined) {
      return NextResponse.json({ error: "Name and rate are required" }, { status: 400 })
    }

    const taxRate = await db.taxRate.create({
      data: {
        name,
        rate: parseFloat(rate) || 0,
        type: type || "percentage",
        isCompound: isCompound || false,
        priority: parseInt(priority, 10) || 0,
        status: "active",
      },
    })

    return NextResponse.json(taxRate, { status: 201 })
  } catch (error) {
    console.error("Error creating tax rate:", error)
    return NextResponse.json({ error: "Failed to create tax rate" }, { status: 500 })
  }
}
