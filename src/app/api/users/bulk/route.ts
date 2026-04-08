import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/users/bulk - Bulk operations on users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userIds } = body as {
      action: 'enable' | 'disable' | 'delete'
      userIds: string[]
    }

    if (!action || !['enable', 'disable', 'delete'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "enable", "disable", or "delete".' },
        { status: 400 }
      )
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds must be a non-empty array.' },
        { status: 400 }
      )
    }

    if (userIds.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 users per bulk operation.' },
        { status: 400 }
      )
    }

    // Verify all users exist
    const existingUsers = await db.radUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    })

    if (existingUsers.length !== userIds.length) {
      const foundIds = new Set(existingUsers.map((u) => u.id))
      const missingIds = userIds.filter((id) => !foundIds.has(id))
      return NextResponse.json(
        { error: `${missingIds.length} user(s) not found.` },
        { status: 404 }
      )
    }

    if (action === 'delete') {
      // Bulk delete in a transaction
      const usernames = existingUsers.map((u) => u.username)

      await db.$transaction(async (tx) => {
        // Delete related data for all users
        await tx.radAcct.deleteMany({
          where: { username: { in: usernames } },
        })
        await tx.radPostAuth.deleteMany({
          where: { username: { in: usernames } },
        })
        await tx.radCheck.deleteMany({
          where: { username: { in: usernames } },
        })
        await tx.radReply.deleteMany({
          where: { username: { in: usernames } },
        })
        await tx.radUserGroup.deleteMany({
          where: { username: { in: usernames } },
        })
        // Delete the users
        await tx.radUser.deleteMany({
          where: { id: { in: userIds } },
        })
      })

      return NextResponse.json({
        success: true,
        count: existingUsers.length,
        message: `Deleted ${existingUsers.length} user(s).`,
      })
    }

    // Bulk enable or disable
    const newStatus = action === 'enable' ? 'active' : 'disabled'

    const result = await db.$transaction(async (tx) => {
      return tx.radUser.updateMany({
        where: { id: { in: userIds } },
        data: { status: newStatus },
      })
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${action === 'enable' ? 'Enabled' : 'Disabled'} ${result.count} user(s).`,
    })
  } catch (error) {
    console.error('Error in bulk user operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}
