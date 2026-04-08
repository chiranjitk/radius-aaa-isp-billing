import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/settings — Get all system settings grouped by group
export async function GET() {
  try {
    const settings = await db.systemSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    })

    // Group by category
    const grouped: Record<string, { id: string; key: string; value: string; type: string; description: string | null }[]> = {}
    settings.forEach((s) => {
      if (!grouped[s.group]) grouped[s.group] = []
      grouped[s.group].push({
        id: s.id,
        key: s.key,
        value: s.value,
        type: s.type,
        description: s.description,
      })
    })

    return NextResponse.json({ settings: grouped })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT /api/settings — Update setting
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields: key, value' }, { status: 400 })
    }

    const setting = await db.systemSetting.findUnique({ where: { key } })
    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    const updated = await db.systemSetting.update({
      where: { key },
      data: { value: String(value) },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}

// POST /api/settings — Create setting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value, type, group, description } = body

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields: key, value' }, { status: 400 })
    }

    const existing = await db.systemSetting.findUnique({ where: { key } })
    if (existing) {
      return NextResponse.json({ error: 'Setting with this key already exists' }, { status: 409 })
    }

    const setting = await db.systemSetting.create({
      data: {
        key,
        value: String(value),
        type: type || 'string',
        group: group || 'general',
        description: description || null,
      },
    })

    return NextResponse.json(setting, { status: 201 })
  } catch (error) {
    console.error('Error creating setting:', error)
    return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 })
  }
}
