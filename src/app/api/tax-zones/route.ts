import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET /api/tax-zones — list all tax zones
export async function GET() {
  try {
    const zones = await db.taxZone.findMany({
      orderBy: { createdAt: "desc" },
    })

    const taxRates = await db.taxRate.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ zones, taxRates })
  } catch (error) {
    console.error("Error fetching tax zones:", error)
    return NextResponse.json({ error: "Failed to fetch tax zones" }, { status: 500 })
  }
}

// POST /api/tax-zones — create a new tax zone
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, country, state, city, taxRateIds, isDefault } = body

    if (!name) {
      return NextResponse.json({ error: "Zone name is required" }, { status: 400 })
    }

    // If this zone is set as default, unset other defaults
    if (isDefault) {
      await db.taxZone.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const zone = await db.taxZone.create({
      data: {
        name,
        country: country || null,
        state: state || null,
        city: city || null,
        taxRateIds: Array.isArray(taxRateIds) ? JSON.stringify(taxRateIds) : "[]",
        isDefault: Boolean(isDefault),
        status: "active",
      },
    })

    return NextResponse.json(zone, { status: 201 })
  } catch (error) {
    console.error("Error creating tax zone:", error)
    return NextResponse.json({ error: "Failed to create tax zone" }, { status: 500 })
  }
}
