import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const groups = await db.radGroup.findMany({
      include: {
        _count: {
          select: { users: true, checkAttrs: true, replyAttrs: true },
        },
      },
      orderBy: { priority: 'desc' },
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error('Failed to fetch groups:', error)
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, priority } = body

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    const existing = await db.radGroup.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'Group already exists' }, { status: 409 })
    }

    const group = await db.radGroup.create({
      data: {
        name,
        description: description || '',
        priority: priority || 0,
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Failed to create group:', error)
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
  }
}
