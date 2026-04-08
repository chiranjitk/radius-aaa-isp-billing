import { NextRequest, NextResponse } from 'next/server'
import { readNotifications } from '@/lib/notification-store'

// POST /api/notifications/read
// Body: { id?: string, all?: boolean }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, all } = body as { id?: string; all?: boolean }

    if (all) {
      // Mark all known notification IDs as read
      for (let i = 1; i <= 10; i++) {
        readNotifications.add(`notif-${i}`)
      }
      return NextResponse.json({ success: true })
    }

    if (id) {
      readNotifications.add(id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Provide "id" or "all" to mark notifications as read' },
      { status: 400 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}
