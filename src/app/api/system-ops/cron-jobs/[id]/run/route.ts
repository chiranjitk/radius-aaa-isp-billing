import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const cronJob = await db.cronJob.findUnique({ where: { id } })
    if (!cronJob) {
      return NextResponse.json({ error: 'Cron job not found' }, { status: 404 })
    }

    if (cronJob.status === 'disabled') {
      return NextResponse.json({ error: 'Cannot run a disabled cron job' }, { status: 400 })
    }

    // Simulate running the job
    const now = new Date()
    const success = Math.random() > 0.15 // 85% success rate

    const updated = await db.cronJob.update({
      where: { id },
      data: {
        status: success ? 'active' : 'error',
        lastRunAt: now,
        lastResult: success ? 'Exit code: 0 — completed successfully' : 'Exit code: 1 — execution failed',
        runCount: { increment: 1 },
        ...(success ? {} : { failCount: { increment: 1 } }),
      },
    })

    return NextResponse.json({
      cronJob: updated,
      result: {
        success,
        exitCode: success ? 0 : 1,
        duration: Math.floor(Math.random() * 3000) + 200, // 200-3200ms
        timestamp: now,
      },
    })
  } catch (error) {
    console.error('Failed to run cron job:', error)
    return NextResponse.json({ error: 'Failed to run cron job' }, { status: 500 })
  }
}
