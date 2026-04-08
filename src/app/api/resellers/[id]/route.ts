import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET /api/resellers/[id] — single reseller with details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const reseller = await db.reseller.findUnique({
      where: { id },
      include: {
        commissions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: {
          select: { commissions: true, transactions: true },
        },
      },
    })

    if (!reseller) {
      return NextResponse.json({ error: "Reseller not found" }, { status: 404 })
    }

    return NextResponse.json(reseller)
  } catch (error) {
    console.error("Error fetching reseller:", error)
    return NextResponse.json(
      { error: "Failed to fetch reseller" },
      { status: 500 }
    )
  }
}

// PUT /api/resellers/[id] — update reseller
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.reseller.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Reseller not found" }, { status: 404 })
    }

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

    // Check for username uniqueness if changing
    if (username && username !== existing.username) {
      const dup = await db.reseller.findUnique({ where: { username } })
      if (dup) {
        return NextResponse.json({ error: "Username already exists" }, { status: 409 })
      }
    }

    // Check for email uniqueness if changing
    if (email && email !== existing.email) {
      const dup = await db.reseller.findUnique({ where: { email } })
      if (dup) {
        return NextResponse.json({ error: "Email already exists" }, { status: 409 })
      }
    }

    const reseller = await db.reseller.update({
      where: { id },
      data: {
        ...(username != null && { username }),
        ...(password != null && { password }),
        ...(fullName != null && { fullName }),
        ...(email != null && { email }),
        ...(phone != null && { phone }),
        ...(company != null && { company }),
        ...(address != null && { address }),
        ...(city != null && { city }),
        ...(state != null && { state }),
        ...(country != null && { country }),
        ...(balance != null && { balance: parseFloat(balance) }),
        ...(commissionRate != null && { commissionRate: parseFloat(commissionRate) }),
        ...(creditLimit != null && { creditLimit: parseFloat(creditLimit) }),
        ...(parentId != null && { parentId: parentId || null }),
        ...(level != null && { level: parseInt(level, 10) }),
        ...(status != null && { status }),
        ...(logoUrl != null && { logoUrl }),
        ...(primaryColor != null && { primaryColor }),
        ...(customDomain != null && { customDomain }),
        ...(customEmail != null && { customEmail }),
        ...(maxUsers != null && { maxUsers: maxUsers ? parseInt(maxUsers, 10) : null }),
        ...(maxNas != null && { maxNas: maxNas ? parseInt(maxNas, 10) : null }),
        ...(ipPoolIds != null && { ipPoolIds }),
      },
      include: {
        _count: {
          select: { commissions: true, transactions: true },
        },
      },
    })

    return NextResponse.json(reseller)
  } catch (error) {
    console.error("Error updating reseller:", error)
    return NextResponse.json(
      { error: "Failed to update reseller" },
      { status: 500 }
    )
  }
}

// DELETE /api/resellers/[id] — delete reseller
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.reseller.findUnique({
      where: { id },
      include: {
        _count: {
          select: { commissions: true, transactions: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Reseller not found" }, { status: 404 })
    }

    // Check for child resellers
    const childCount = await db.reseller.count({ where: { parentId: id } })
    if (childCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete reseller with child resellers. Remove children first." },
        { status: 409 }
      )
    }

    await db.reseller.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting reseller:", error)
    return NextResponse.json(
      { error: "Failed to delete reseller" },
      { status: 500 }
    )
  }
}
