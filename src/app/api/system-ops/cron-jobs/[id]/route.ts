import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, schedule, command, status, timeout } = body

    const existing = await db.cronJob.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cron job not found' }, { status: 404 })
    }

    // Validate cron expression if provided
    if (schedule) {
      const cronParts = schedule.trim().split(/\s+/)
      if (cronParts.length < 5 || cronParts.length > 6) {
        return NextResponse.json(
          { error: 'Invalid cron expression. Expected 5-6 fields' },
          { status: 400 }
        )
      }
    }

    const cronJob = await db.cronJob.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(schedule && { schedule: schedule.trim() }),
        ...(command && { command }),
        ...(status && { status }),
        ...(timeout && { timeout }),
      },
    })

    return NextResponse.json({ cronJob })
  } catch (error) {
    console.error('Failed to update cron job:', error)
    return NextResponse.json({ error: 'Failed to update cron job' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.cronJob.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Cron job not found' }, { status: 404 })
    }

    await db.cronJob.delete({ where: { id } })

    return NextResponse.json({ message: 'Cron job deleted successfully' })
  } catch (error) {
    console.error('Failed to delete cron job:', error)
    return NextResponse.json({ error: 'Failed to delete cron job' }, { status: 500 })
  }
}
