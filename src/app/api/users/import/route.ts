import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface ImportUser {
  username?: string
  fullName?: string
  email?: string
  password?: string
  phone?: string
  company?: string
  address?: string
  authType?: string
  status?: string
  [key: string]: string | undefined
}

/**
 * Parse a CSV string into an array of row objects.
 * Handles quoted fields, trims whitespace, and skips empty rows.
 */
function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length < 2) {
    return { headers: [], rows: [] }
  }

  // Parse a single CSV line, handling quoted fields
  function parseLine(line: string): string[] {
    const fields: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]

      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i++ // skip escaped quote
          } else {
            inQuotes = false
          }
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          fields.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    fields.push(current.trim())
    return fields
  }

  const headers = parseLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] !== undefined ? values[j] : ''
    }
    rows.push(row)
  }

  return { headers, rows }
}

export async function POST(request: NextRequest) {
  try {
    // Determine content type: FormData (file upload) or JSON (direct data)
    const contentType = request.headers.get('content-type') || ''
    let users: ImportUser[] = []

    if (contentType.includes('multipart/form-data')) {
      // FormData: extract CSV file and parse it
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided in the upload' },
          { status: 400 }
        )
      }

      if (!file.name.toLowerCase().endsWith('.csv')) {
        return NextResponse.json(
          { error: 'Uploaded file must be a CSV file (.csv)' },
          { status: 400 }
        )
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size exceeds 5MB limit' },
          { status: 400 }
        )
      }

      const csvText = await file.text()
      const { headers, rows } = parseCSV(csvText)

      if (headers.length === 0 || rows.length === 0) {
        return NextResponse.json(
          { error: 'CSV file is empty or has no data rows' },
          { status: 400 }
        )
      }

      // Map CSV columns to ImportUser fields
      users = rows.map((row) => ({
        username: (row['username'] || row['Username'] || '').trim(),
        password: (row['password'] || row['Password'] || '').trim(),
        fullName: (row['fullName'] || row['fullname'] || row['Full Name'] || '').trim(),
        email: (row['email'] || row['Email'] || '').trim(),
        phone: (row['phone'] || row['Phone'] || '').trim(),
        company: (row['company'] || row['Company'] || '').trim(),
        address: (row['address'] || row['Address'] || '').trim(),
        authType: (row['authType'] || row['authtype'] || row['Auth Type'] || '').trim(),
        status: (row['status'] || row['Status'] || '').trim(),
      }))
    } else {
      // JSON: receive users array directly
      const body = await request.json()
      const { users: bodyUsers } = body as { users?: ImportUser[] }

      if (!bodyUsers || !Array.isArray(bodyUsers) || bodyUsers.length === 0) {
        return NextResponse.json(
          { error: 'No users data provided' },
          { status: 400 }
        )
      }

      users = bodyUsers
    }

    if (users.length > 1000) {
      return NextResponse.json(
        { error: 'Too many users in a single batch (max 1000)' },
        { status: 400 }
      )
    }

    // Validate auth types and statuses
    const validAuthTypes = ['PAP', 'CHAP', 'MS-CHAPv2', 'EAP']
    const validStatuses = ['active', 'disabled', 'suspended']
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    // Fetch existing usernames for duplicate checking
    const existingUsers = await db.radUser.findMany({
      select: { username: true },
    })
    const existingUsernames = new Set(existingUsers.map((u) => u.username))

    const errors: Array<{ row: number; username: string; error: string }> = []
    const validUsers: Array<{
      username: string
      fullName?: string
      email?: string
      password: string
      phone?: string
      company?: string
      address?: string
      authType: string
      status: string
    }> = []

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const rowNum = i + 1
      const username = user.username?.trim() || ''

      // Validate required fields
      if (!username) {
        errors.push({
          row: rowNum,
          username: '(empty)',
          error: 'Username is required',
        })
        continue
      }

      if (!user.password?.trim()) {
        errors.push({
          row: rowNum,
          username,
          error: 'Password is required',
        })
        continue
      }

      // Check for existing username
      if (existingUsernames.has(username)) {
        errors.push({
          row: rowNum,
          username,
          error: 'Username already exists',
        })
        continue
      }

      // Validate email format if provided
      if (user.email?.trim() && !emailRegex.test(user.email.trim())) {
        errors.push({
          row: rowNum,
          username,
          error: 'Invalid email format',
        })
        continue
      }

      // Normalize authType and status
      let authType = user.authType?.trim() || 'PAP'
      if (!validAuthTypes.includes(authType)) {
        authType = 'PAP'
      }

      let status = user.status?.trim()?.toLowerCase() || 'active'
      if (!validStatuses.includes(status)) {
        status = 'active'
      }

      // Track username to prevent batch-internal duplicates
      existingUsernames.add(username)
      validUsers.push({
        username,
        fullName: user.fullName?.trim() || undefined,
        email: user.email?.trim() || undefined,
        password: user.password.trim(),
        phone: user.phone?.trim() || undefined,
        company: user.company?.trim() || undefined,
        address: user.address?.trim() || undefined,
        authType,
        status,
      })
    }

    // Create users in a transaction
    let created = 0

    await db.$transaction(async (tx) => {
      for (const user of validUsers) {
        await tx.radUser.create({
          data: {
            username: user.username,
            password: user.password,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone,
            company: user.company,
            address: user.address,
            authType: user.authType,
            status: user.status,
            kycStatus: 'pending',
            simultaneous: 1,
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

      // Create AuditLog entry for the import action
      await tx.auditLog.create({
        data: {
          action: 'import',
          module: 'users',
          details: `CSV import: ${created} users imported, ${errors.length} skipped (${users.length} total)`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      imported: created,
      skipped: errors.length,
      total: users.length,
      created,
      errors,
    })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json(
      { error: 'Failed to import users' },
      { status: 500 }
    )
  }
}
