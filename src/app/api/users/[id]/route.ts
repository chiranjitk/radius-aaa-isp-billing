import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/users/[id] - Get single user with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.radUser.findUnique({
      where: { id },
      include: {
        groups: {
          include: {
            group: true,
          },
          orderBy: { priority: 'asc' },
        },
        checkAttrs: {
          orderBy: { id: 'asc' },
        },
        replyAttrs: {
          orderBy: { id: 'asc' },
        },
        sessions: {
          orderBy: { acctStartTime: 'desc' },
          take: 20,
        },
        subscriptions: {
          include: {
            plan: true,
            invoices: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            sessions: true,
            invoices: true,
            payments: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existingUser = await db.radUser.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const {
      username,
      password,
      fullName,
      email,
      phone,
      company,
      address,
      authType,
      simultaneous,
      status,
      groupIds,
      checkAttrs,
      replyAttrs,
    } = body

    // If username is being changed, check for conflicts
    if (username && username !== existingUser.username) {
      const conflict = await db.radUser.findUnique({
        where: { username },
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      fullName: fullName ?? existingUser.fullName,
      email: email ?? existingUser.email,
      phone: phone ?? existingUser.phone,
      company: company ?? existingUser.company,
      address: address ?? existingUser.address,
      authType: authType ?? existingUser.authType,
      simultaneous: simultaneous ?? existingUser.simultaneous,
      status: status ?? existingUser.status,
    }

    if (username && username !== existingUser.username) {
      updateData.username = username
    }

    if (password && password !== existingUser.password) {
      updateData.password = password

      // Update the Cleartext-Password check attribute
      await db.radCheck.updateMany({
        where: {
          username: existingUser.username,
          attribute: 'Cleartext-Password',
        },
        data: {
          username: username || existingUser.username,
          value: password,
        },
      })
    } else if (username && username !== existingUser.username) {
      // If username changed but password didn't, update references
      await db.radCheck.updateMany({
        where: { username: existingUser.username },
        data: { username },
      })
      await db.radReply.updateMany({
        where: { username: existingUser.username },
        data: { username },
      })
      await db.radUserGroup.updateMany({
        where: { username: existingUser.username },
        data: { username },
      })
    }

    // Update check attributes if provided
    if (checkAttrs !== undefined) {
      // Delete existing and recreate
      await db.radCheck.deleteMany({
        where: { username: existingUser.username },
      })
      if (checkAttrs.length > 0) {
        await db.radCheck.createMany({
          data: checkAttrs.map((attr: { attribute: string; op: string; value: string }) => ({
            username: username || existingUser.username,
            attribute: attr.attribute,
            op: attr.op || ':=',
            value: attr.value,
          })),
        })
      }
    }

    // Update reply attributes if provided
    if (replyAttrs !== undefined) {
      await db.radReply.deleteMany({
        where: { username: existingUser.username },
      })
      if (replyAttrs.length > 0) {
        await db.radReply.createMany({
          data: replyAttrs.map((attr: { attribute: string; op: string; value: string }) => ({
            username: username || existingUser.username,
            attribute: attr.attribute,
            op: attr.op || '=',
            value: attr.value,
          })),
        })
      }
    }

    // Update group assignments if provided
    if (groupIds !== undefined) {
      await db.radUserGroup.deleteMany({
        where: { username: existingUser.username },
      })

      if (groupIds.length > 0) {
        const groups = await db.radGroup.findMany({
          where: { id: { in: groupIds } },
        })
        if (groups.length !== groupIds.length) {
          return NextResponse.json(
            { error: 'One or more specified groups do not exist' },
            { status: 400 }
          )
        }

        await db.radUserGroup.createMany({
          data: groupIds.map((groupId: string, index: number) => ({
            username: username || existingUser.username,
            groupName: groups.find(g => g.id === groupId)!.name,
            priority: index + 1,
          })),
        })
      }
    }

    const updatedUser = await db.radUser.update({
      where: { id },
      data: updateData,
      include: {
        groups: {
          include: {
            group: true,
          },
        },
        checkAttrs: true,
        replyAttrs: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete user and related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingUser = await db.radUser.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const username = existingUser.username

    // Delete in correct order due to foreign key constraints
    // RadAcct references username (optional), delete related sessions
    await db.radAcct.deleteMany({ where: { username } })

    // RadPostAuth references username
    await db.radPostAuth.deleteMany({ where: { username } })

    // RadCheck, RadReply reference username
    await db.radCheck.deleteMany({ where: { username } })
    await db.radReply.deleteMany({ where: { username } })

    // RadUserGroup references username
    await db.radUserGroup.deleteMany({ where: { username } })

    // Finally delete the user
    await db.radUser.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
