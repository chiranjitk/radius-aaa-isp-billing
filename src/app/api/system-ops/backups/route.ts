import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const backups = await db.backup.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const stats = {
      total: backups.length,
      totalSize: backups.reduce((sum, b) => sum + (b.fileSize ?? 0), 0),
      completed: backups.filter((b) => b.status === 'completed').length,
      failed: backups.filter((b) => b.status === 'failed').length,
      latest: backups[0]?.createdAt ?? null,
    }

    return NextResponse.json({ backups, stats })
  } catch (error) {
    console.error('Failed to fetch backups:', error)
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, notes } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }

    if (!['full', 'incremental'].includes(type)) {
      return NextResponse.json({ error: 'Type must be full or incremental' }, { status: 400 })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filePath = `/var/backups/freeradius/${type}-${timestamp}.sql.gz`

    // Simulate backup creation with realistic data
    const fileSize = type === 'full'
      ? Math.floor(Math.random() * 50_000_000) + 10_000_000 // 10-60 MB
      : Math.floor(Math.random() * 5_000_000) + 500_000 // 0.5-5.5 MB

    const checksum = 'sha256:' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')

    const backup = await db.backup.create({
      data: {
        name,
        type,
        filePath,
        fileSize,
        checksum,
        status: 'completed',
        notes: notes ?? null,
        createdById: 'system',
      },
    })

    return NextResponse.json({ backup }, { status: 201 })
  } catch (error) {
    console.error('Failed to create backup:', error)
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 })
  }
}
