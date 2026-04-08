import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/users/batch — Batch operations on users
// Body: { action: "enable" | "disable" | "delete" | "changeGroup", userIds: string[], groupId?: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userIds, groupId } = body as {
      action: 'enable' | 'disable' | 'delete' | 'changeGroup'
      userIds: string[]
      groupId?: string
    }

    const validActions = ['enable', 'disable', 'delete', 'changeGroup']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
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
        { error: 'Maximum 500 users per batch operation.' },
        { status: 400 }
      )
    }

    if (action === 'changeGroup' && !groupId) {
      return NextResponse.json(
        { error: 'groupId is required for changeGroup action.' },
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
      const missingCount = userIds.filter((id) => !foundIds.has(id)).length
      return NextResponse.json(
        { error: `${missingCount} user(s) not found.` },
        { status: 404 }
      )
    }

    const errors: string[] = []

    if (action === 'changeGroup') {
      // Verify group exists
      const group = await db.radGroup.findUnique({
        where: { id: groupId },
      })

      if (!group) {
        return NextResponse.json(
          { error: 'Group not found.' },
          { status: 404 }
        )
      }

      const usernames = existingUsers.map((u) => u.username)
      const affected = await db.$transaction(async (tx) => {
        // Remove existing group assignments for these users
        await tx.radUserGroup.deleteMany({
          where: { username: { in: usernames } },
        })

        // Create new group assignments
        const result = await tx.radUserGroup.createMany({
          data: usernames.map((username) => ({
            username,
            groupName: group.name,
            priority: 1,
          })),
          skipDuplicates: true,
        })

        return result.count
      })

      return NextResponse.json({
        success: true,
        affected,
        errors: errors.length > 0 ? errors : undefined,
      })
    }

    if (action === 'delete') {
      const usernames = existingUsers.map((u) => u.username)

      await db.$transaction(async (tx) => {
        await tx.radAcct.deleteMany({ where: { username: { in: usernames } } })
        await tx.radPostAuth.deleteMany({ where: { username: { in: usernames } } })
        await tx.radCheck.deleteMany({ where: { username: { in: usernames } } })
        await tx.radReply.deleteMany({ where: { username: { in: usernames } } })
        await tx.radUserGroup.deleteMany({ where: { username: { in: usernames } } })
        await tx.radUser.deleteMany({ where: { id: { in: userIds } } })
      })

      return NextResponse.json({
        success: true,
        affected: existingUsers.length,
        errors: errors.length > 0 ? errors : undefined,
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
      affected: result.count,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in batch user operation:', error)
    return NextResponse.json(
      { error: 'Failed to perform batch operation' },
      { status: 500 }
    )
  }
}
