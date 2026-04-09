import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/hotspot/[id] - Update a hotspot location
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.hotspotLocation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Hotspot location not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      nasId,
      address,
      latitude,
      longitude,
      splashPageUrl,
      logoUrl,
      welcomeMsg,
      termsOfService,
      bandwidthLimitDown,
      bandwidthLimitUp,
      sessionTimeout,
      dailyDataLimit,
      allowFreeAccess,
      freeDataLimit,
      freeTimeLimit,
      walledGardenSites,
      status,
    } = body

    if (name !== undefined && !name.trim()) {
      return NextResponse.json(
        { error: 'Location name cannot be empty' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (nasId !== undefined) updateData.nasId = nasId || null
    if (address !== undefined) updateData.address = address?.trim() || null
    if (latitude !== undefined) updateData.latitude = latitude != null ? parseFloat(latitude) : null
    if (longitude !== undefined) updateData.longitude = longitude != null ? parseFloat(longitude) : null
    if (splashPageUrl !== undefined) updateData.splashPageUrl = splashPageUrl?.trim() || null
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl?.trim() || null
    if (welcomeMsg !== undefined) updateData.welcomeMsg = welcomeMsg?.trim() || null
    if (termsOfService !== undefined) updateData.termsOfService = termsOfService?.trim() || null
    if (bandwidthLimitDown !== undefined) updateData.bandwidthLimitDown = bandwidthLimitDown ? parseInt(bandwidthLimitDown) : null
    if (bandwidthLimitUp !== undefined) updateData.bandwidthLimitUp = bandwidthLimitUp ? parseInt(bandwidthLimitUp) : null
    if (sessionTimeout !== undefined) updateData.sessionTimeout = sessionTimeout ? parseInt(sessionTimeout) : null
    if (dailyDataLimit !== undefined) updateData.dailyDataLimit = dailyDataLimit ? parseInt(dailyDataLimit) : null
    if (allowFreeAccess !== undefined) updateData.allowFreeAccess = !!allowFreeAccess
    if (freeDataLimit !== undefined) updateData.freeDataLimit = freeDataLimit ? parseInt(freeDataLimit) : null
    if (freeTimeLimit !== undefined) updateData.freeTimeLimit = freeTimeLimit ? parseInt(freeTimeLimit) : null
    if (walledGardenSites !== undefined) updateData.walledGardenSites = walledGardenSites?.trim() || null
    if (status !== undefined) updateData.status = status

    const updated = await db.hotspotLocation.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ location: updated })
  } catch (error) {
    console.error('Error updating hotspot location:', error)
    return NextResponse.json(
      { error: 'Failed to update hotspot location' },
      { status: 500 }
    )
  }
}

// DELETE /api/hotspot/[id] - Delete a hotspot location
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.hotspotLocation.findUnique({
      where: { id },
      include: {
        _count: { select: { vouchers: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Hotspot location not found' },
        { status: 404 }
      )
    }

    await db.hotspotLocation.delete({ where: { id } })

    return NextResponse.json({
      message: 'Hotspot location deleted successfully',
      locationId: id,
    })
  } catch (error) {
    console.error('Error deleting hotspot location:', error)
    return NextResponse.json(
      { error: 'Failed to delete hotspot location' },
      { status: 500 }
    )
  }
}
