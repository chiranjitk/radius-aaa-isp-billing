import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admins/[id] - Get a single admin
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const admin = await db.admin.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        loginAttempts: true,
        lockedUntil: true,
        passwordChangedAt: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        apiKeys: {
          select: { id: true, name: true, keyPrefix: true, status: true, lastUsedAt: true, createdAt: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        assignedTickets: {
          select: { id: true, ticketNo: true, subject: true, status: true, priority: true, createdAt: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Get recent login attempts for this admin
    const loginAttempts = await db.loginAttempt.findMany({
      where: { username: admin.username },
      orderBy: { timestamp: 'desc' },
      take: 20,
    })

    return NextResponse.json({ admin, loginAttempts })
  } catch (error) {
    console.error('Error fetching admin:', error)
    return NextResponse.json({ error: 'Failed to fetch admin' }, { status: 500 })
  }
}

// PUT /api/admins/[id] - Update admin profile
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.admin.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    const body = await request.json()
    const { fullName, email, phone, role, status } = body

    const updateData: Record<string, unknown> = {}
    if (fullName !== undefined) updateData.fullName = fullName?.trim() || null
    if (email !== undefined) {
      const trimmedEmail = email?.trim().toLowerCase()
      if (trimmedEmail && trimmedEmail !== existing.email) {
        const emailExists = await db.admin.findFirst({
          where: { email: trimmedEmail, NOT: { id } },
        })
        if (emailExists) {
          return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
        }
      }
      updateData.email = trimmedEmail
    }
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (role !== undefined) updateData.role = role
    if (status !== undefined) {
      updateData.status = status
      // If unlocking, reset login attempts and lock time
      if (status === 'active' && existing.status === 'locked') {
        updateData.loginAttempts = 0
        updateData.lockedUntil = null
      }
      // If locking, set locked until far future
      if (status === 'locked') {
        updateData.lockedUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    }

    const updated = await db.admin.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ admin: updated })
  } catch (error) {
    console.error('Error updating admin:', error)
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 })
  }
}

// DELETE /api/admins/[id] - Delete an admin
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.admin.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    await db.admin.delete({ where: { id } })

    return NextResponse.json({ message: 'Admin deleted successfully', adminId: id })
  } catch (error) {
    console.error('Error deleting admin:', error)
    return NextResponse.json({ error: 'Failed to delete admin' }, { status: 500 })
  }
}
