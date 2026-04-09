import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/hotspot - List all hotspot locations with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    const where: Prisma.HotspotLocationWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    const skip = (page - 1) * limit

    const locations = await db.hotspotLocation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { vouchers: true },
        },
        nas: {
          select: { nasName: true, ipAddress: true, status: true },
        },
      },
    })

    const total = await db.hotspotLocation.count({ where })

    const stats = await Promise.all([
      db.hotspotLocation.count(),
      db.hotspotLocation.count({ where: { status: 'active' } }),
      db.voucher.count(),
      db.hotspotSession.count({ where: { status: 'active' } }),
    ])

    return NextResponse.json({
      locations: locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        description: loc.description,
        nasId: loc.nasId,
        nasName: loc.nas?.nasName || null,
        nasIpAddress: loc.nas?.ipAddress || null,
        nasStatus: loc.nas?.status || null,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        splashPageUrl: loc.splashPageUrl,
        logoUrl: loc.logoUrl,
        welcomeMsg: loc.welcomeMsg,
        termsOfService: loc.termsOfService,
        bandwidthLimitDown: loc.bandwidthLimitDown,
        bandwidthLimitUp: loc.bandwidthLimitUp,
        sessionTimeout: loc.sessionTimeout,
        dailyDataLimit: loc.dailyDataLimit,
        allowFreeAccess: loc.allowFreeAccess,
        freeDataLimit: loc.freeDataLimit,
        freeTimeLimit: loc.freeTimeLimit,
        walledGardenSites: loc.walledGardenSites,
        status: loc.status,
        totalVouchers: loc._count.vouchers,
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalLocations: stats[0],
        activeLocations: stats[1],
        totalVouchers: stats[2],
        activeSessions: stats[3],
      },
    })
  } catch (error) {
    console.error('Error fetching hotspot locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hotspot locations' },
      { status: 500 }
    )
  }
}

// POST /api/hotspot - Create a new hotspot location
export async function POST(request: NextRequest) {
  try {
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

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      )
    }

    const location = await db.hotspotLocation.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        nasId: nasId || null,
        address: address?.trim() || null,
        latitude: latitude != null ? parseFloat(latitude) : null,
        longitude: longitude != null ? parseFloat(longitude) : null,
        splashPageUrl: splashPageUrl?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        welcomeMsg: welcomeMsg?.trim() || null,
        termsOfService: termsOfService?.trim() || null,
        bandwidthLimitDown: bandwidthLimitDown ? parseInt(bandwidthLimitDown) : null,
        bandwidthLimitUp: bandwidthLimitUp ? parseInt(bandwidthLimitUp) : null,
        sessionTimeout: sessionTimeout ? parseInt(sessionTimeout) : null,
        dailyDataLimit: dailyDataLimit ? parseInt(dailyDataLimit) : null,
        allowFreeAccess: !!allowFreeAccess,
        freeDataLimit: freeDataLimit ? parseInt(freeDataLimit) : null,
        freeTimeLimit: freeTimeLimit ? parseInt(freeTimeLimit) : null,
        walledGardenSites: walledGardenSites?.trim() || null,
        status: status || 'active',
      },
    })

    return NextResponse.json({ location }, { status: 201 })
  } catch (error) {
    console.error('Error creating hotspot location:', error)
    return NextResponse.json(
      { error: 'Failed to create hotspot location' },
      { status: 500 }
    )
  }
}
