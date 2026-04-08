import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'

// POST /api/vouchers/batch - Batch generate vouchers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      locationId,
      planId,
      type,
      value,
      quantity,
      expiresAt,
      speedDown,
      speedUp,
      simultaneous,
      prefix,
    } = body

    if (!quantity || quantity < 1 || quantity > 500) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 500' },
        { status: 400 }
      )
    }

    if (!type || !['time', 'data', 'unlimited'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be time, data, or unlimited' },
        { status: 400 }
      )
    }

    // Generate batch ID
    const batchId = `BATCH-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`

    // Generate unique codes
    const codePrefix = prefix ? prefix.trim().toUpperCase() : 'VC'
    const existingCodes = new Set<string>()
    const vouchers = []

    for (let i = 0; i < quantity; i++) {
      let code: string
      let attempts = 0

      do {
        const random = randomBytes(4).toString('hex').toUpperCase()
        code = `${codePrefix}-${random}`
        attempts++
        if (attempts > 10) {
          code = `${codePrefix}-${randomBytes(8).toString('hex').toUpperCase()}`
        }
      } while (existingCodes.has(code))

      existingCodes.add(code)

      vouchers.push({
        code,
        batchId,
        locationId: locationId || null,
        planId: planId || null,
        type: type || 'time',
        value: value ? parseInt(value) : 0,
        speedDown: speedDown ? parseInt(speedDown) : null,
        speedUp: speedUp ? parseInt(speedUp) : null,
        simultaneous: simultaneous || 1,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
    }

    // Bulk create
    const result = await db.voucher.createMany({
      data: vouchers,
    })

    return NextResponse.json({
      message: `Successfully generated ${result.count} vouchers`,
      batchId,
      count: result.count,
    }, { status: 201 })
  } catch (error) {
    console.error('Error batch generating vouchers:', error)
    return NextResponse.json(
      { error: 'Failed to generate vouchers' },
      { status: 500 }
    )
  }
}
