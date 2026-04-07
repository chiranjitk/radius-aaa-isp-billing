import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { users } = body as {
      users: Array<{
        username?: string
        fullName?: string
        email?: string
        password?: string
        authType?: string
        status?: string
      }>
    }

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'No users data provided' },
        { status: 400 }
      )
    }

    if (users.length > 1000) {
      return NextResponse.json(
        { error: 'Too many users in a single batch (max 1000)' },
        { status: 400 }
      )
    }

    const validAuthTypes = ['PAP', 'CHAP', 'MS-CHAPv2', 'EAP']
    const validStatuses = ['active', 'disabled', 'suspended']

    // Fetch existing usernames for duplicate checking
    const existingUsers = await db.radUser.findMany({
      select: { username: true },
    })
    const existingUsernames = new Set(existingUsers.map((u) => u.username))

    const skipped: Array<{ row: number; username: string; reason: string }> = []
    const validUsers: Array<{
      username: string
      fullName?: string
      email?: string
      password: string
      authType: string
      status: string
    }> = []

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const rowNum = i + 1

      // Validate required fields
      if (!user.username || !user.username.trim()) {
        skipped.push({
          row: rowNum,
          username: user.username || '(empty)',
          reason: 'invalid',
        })
        continue
      }

      const username = user.username.trim()

      // Check for duplicates
      if (existingUsernames.has(username)) {
        skipped.push({
          row: rowNum,
          username,
          reason: 'duplicate',
        })
        continue
      }

      // Validate email format if provided
      if (user.email && user.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(user.email.trim())) {
          skipped.push({
            row: rowNum,
            username,
            reason: 'invalid email',
          })
          continue
        }
      }

      // Validate auth type (default to PAP)
      let authType = user.authType?.trim() || 'PAP'
      if (!validAuthTypes.includes(authType)) {
        authType = 'PAP'
      }

      // Validate status (default to active)
      let status = user.status?.trim()?.toLowerCase() || 'active'
      if (!validStatuses.includes(status)) {
        status = 'active'
      }

      // Password is required - use a default if not provided
      const password = user.password?.trim() || 'changeme123'

      // Add to valid list and track username to prevent batch-internal duplicates
      existingUsernames.add(username)
      validUsers.push({
        username,
        fullName: user.fullName?.trim() || undefined,
        email: user.email?.trim() || undefined,
        password,
        authType,
        status,
      })
    }

    // Create users in a transaction
    let created = 0

    await db.$transaction(async (tx) => {
      for (const user of validUsers) {
        // Create the RadUser
        await tx.radUser.create({
          data: {
            username: user.username,
            password: user.password,
            fullName: user.fullName,
            email: user.email,
            authType: user.authType,
            status: user.status,
            simultaneous: 1,
            // Create default Cleartext-Password check attribute
            checkAttrs: {
              create: {
                attribute: 'Cleartext-Password',
                op: ':=',
                value: user.password,
              },
            },
          },
        })
        created++
      }
    })

    return NextResponse.json({
      created,
      skipped,
      total: users.length,
    })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json(
      { error: 'Failed to import users' },
      { status: 500 }
    )
  }
}
