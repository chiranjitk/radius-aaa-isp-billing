import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const cronJobs = await db.cronJob.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const stats = {
      total: cronJobs.length,
      active: cronJobs.filter((j) => j.status === 'active').length,
      disabled: cronJobs.filter((j) => j.status === 'disabled').length,
      error: cronJobs.filter((j) => j.status === 'error').length,
      totalRuns: cronJobs.reduce((sum, j) => sum + j.runCount, 0),
      totalFailures: cronJobs.reduce((sum, j) => sum + j.failCount, 0),
    }

    return NextResponse.json({ cronJobs, stats })
  } catch (error) {
    console.error('Failed to fetch cron jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch cron jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, schedule, command, timeout } = body

    if (!name || !schedule || !command) {
      return NextResponse.json({ error: 'Name, schedule, and command are required' }, { status: 400 })
    }

    // Basic cron expression validation
    const cronParts = schedule.trim().split(/\s+/)
    if (cronParts.length < 5 || cronParts.length > 6) {
      return NextResponse.json(
        { error: 'Invalid cron expression. Expected 5-6 fields (min hour day month weekday [year])' },
        { status: 400 }
      )
    }

    const cronJob = await db.cronJob.create({
      data: {
        name,
        description: description ?? null,
        schedule: schedule.trim(),
        command,
        status: 'active',
        timeout: timeout ?? 300,
        createdBy: 'system',
      },
    })

    return NextResponse.json({ cronJob }, { status: 201 })
  } catch (error) {
    console.error('Failed to create cron job:', error)
    return NextResponse.json({ error: 'Failed to create cron job' }, { status: 500 })
  }
}
