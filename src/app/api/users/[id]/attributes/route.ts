import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/users/[id]/attributes?type=check|reply - List attributes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'check'

    const user = await db.radUser.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (type === 'reply') {
      const attrs = await db.radReply.findMany({
        where: { username: user.username },
        orderBy: { id: 'asc' },
      })
      return NextResponse.json({ attributes: attrs })
    } else {
      const attrs = await db.radCheck.findMany({
        where: { username: user.username },
        orderBy: { id: 'asc' },
      })
      return NextResponse.json({ attributes: attrs })
    }
  } catch (error) {
    console.error('Error fetching attributes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attributes' },
      { status: 500 }
    )
  }
}

// POST /api/users/[id]/attributes?type=check|reply - Add attribute
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'check'
    const body = await request.json()
    const { attribute, operator, value } = body

    if (!attribute || !value) {
      return NextResponse.json(
        { error: 'Attribute and value are required' },
        { status: 400 }
      )
    }

    const user = await db.radUser.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (type === 'reply') {
      const attr = await db.radReply.create({
        data: {
          username: user.username,
          attribute: attribute.trim(),
          op: operator || '=',
          value: value.trim(),
        },
      })
      return NextResponse.json({ attribute: attr }, { status: 201 })
    } else {
      const attr = await db.radCheck.create({
        data: {
          username: user.username,
          attribute: attribute.trim(),
          op: operator || ':=',
          value: value.trim(),
        },
      })
      return NextResponse.json({ attribute: attr }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating attribute:', error)
    return NextResponse.json(
      { error: 'Failed to create attribute' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id]/attributes?type=check|reply&id=<attributeId> - Delete attribute
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'check'
    const attributeId = searchParams.get('attrId')

    if (!attributeId) {
      return NextResponse.json(
        { error: 'Attribute ID is required' },
        { status: 400 }
      )
    }

    // Verify the user exists
    const user = await db.radUser.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (type === 'reply') {
      // Verify the attribute belongs to this user
      const attr = await db.radReply.findUnique({
        where: { id: attributeId },
      })
      if (!attr || attr.username !== user.username) {
        return NextResponse.json({ error: 'Attribute not found' }, { status: 404 })
      }
      await db.radReply.delete({
        where: { id: attributeId },
      })
    } else {
      // Verify the attribute belongs to this user
      const attr = await db.radCheck.findUnique({
        where: { id: attributeId },
      })
      if (!attr || attr.username !== user.username) {
        return NextResponse.json({ error: 'Attribute not found' }, { status: 404 })
      }
      await db.radCheck.delete({
        where: { id: attributeId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting attribute:', error)
    return NextResponse.json(
      { error: 'Failed to delete attribute' },
      { status: 500 }
    )
  }
}
