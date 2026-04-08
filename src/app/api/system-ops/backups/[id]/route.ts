import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const backup = await db.backup.findUnique({ where: { id } })
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    await db.backup.delete({ where: { id } })

    return NextResponse.json({ message: 'Backup deleted successfully' })
  } catch (error) {
    console.error('Failed to delete backup:', error)
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 })
  }
}
