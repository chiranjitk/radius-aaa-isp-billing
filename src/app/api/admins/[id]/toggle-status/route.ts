import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admins/[id]/toggle-status - Enable, disable, or lock admin
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['active', 'disabled', 'locked'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be active, disabled, or locked' },
        { status: 400 }
      )
    }

    const existing = await db.admin.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { status }

    if (status === 'active') {
      // Unlocking: reset login attempts and lock time
      updateData.loginAttempts = 0
      updateData.lockedUntil = null
    }

    if (status === 'locked') {
      // Locking: set locked until far future (manual unlock required)
      updateData.lockedUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }

    const updated = await db.admin.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        loginAttempts: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Log the status change
    await db.auditLog.create({
      data: {
        username: existing.username,
        action: `admin.status.${status}`,
        module: 'admin',
        details: `Admin "${existing.username}" status changed from "${existing.status}" to "${status}"`,
      },
    })

    return NextResponse.json({
      admin: updated,
      message: `Admin status updated to ${status}`,
    })
  } catch (error) {
    console.error('Error toggling admin status:', error)
    return NextResponse.json({ error: 'Failed to update admin status' }, { status: 500 })
  }
}
