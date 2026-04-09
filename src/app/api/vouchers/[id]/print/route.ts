import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/vouchers/[id]/print - Get voucher in print format
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const voucher = await db.voucher.findUnique({
      where: { id },
      include: {
        location: {
          select: { name: true, address: true, welcomeMsg: true },
        },
      },
    })

    if (!voucher) {
      return NextResponse.json(
        { error: 'Voucher not found' },
        { status: 404 }
      )
    }

    // Mark as printed
    await db.voucher.update({
      where: { id },
      data: { printedAt: new Date() },
    })

    const typeLabels: Record<string, string> = {
      time: 'Time-Based',
      data: 'Data-Based',
      unlimited: 'Unlimited',
    }

    const valueLabel = voucher.type === 'time'
      ? `${voucher.value} minutes`
      : voucher.type === 'data'
        ? `${voucher.value} MB`
        : 'Unlimited Access'

    const speedInfo = voucher.speedDown || voucher.speedUp
      ? `${voucher.speedDown || 'Unlimited'}↓ / ${voucher.speedUp || 'Unlimited'}↑ Kbps`
      : 'No speed limit'

    return NextResponse.json({
      voucher: {
        code: voucher.code,
        type: typeLabels[voucher.type] || voucher.type,
        typeValue: voucher.type,
        value: valueLabel,
        speedInfo,
        status: voucher.status,
        expiresAt: voucher.expiresAt,
        locationName: voucher.location?.name || 'Any Location',
        locationAddress: voucher.location?.address || '',
        welcomeMsg: voucher.location?.welcomeMsg || 'Enjoy your internet access!',
        createdAt: voucher.createdAt,
      },
    })
  } catch (error) {
    console.error('Error fetching voucher print data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch voucher for printing' },
      { status: 500 }
    )
  }
}
