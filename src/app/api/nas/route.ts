import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// GET /api/nas - List NAS devices with search, filters, pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search') || ''
    const vendorType = searchParams.get('vendorType') || ''
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const where: Prisma.NasWhereInput = {}

    if (search) {
      where.OR = [
        { nasName: { contains: search } },
        { shortName: { contains: search } },
        { ipAddress: { contains: search } },
        { description: { contains: search } },
        { vendor: { contains: search } },
        { model: { contains: search } },
        { location: { contains: search } },
      ]
    }

    if (vendorType) {
      where.nasType = vendorType
    }

    if (status) {
      where.status = status
    }

    const skip = (page - 1) * limit

    // Fetch NAS devices with active session counts
    const nasDevices = await db.nas.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            acctRecords: {
              where: { status: 'active' },
            },
          },
        },
      },
    })

    const total = await db.nas.count({ where })

    // Fetch aggregate stats
    const [totalCount, onlineCount, offlineCount, totalActiveSessions] = await Promise.all([
      db.nas.count(),
      db.nas.count({ where: { status: 'up' } }),
      db.nas.count({ where: { status: 'down' } }),
      db.radAcct.count({ where: { status: 'active' } }),
    ])

    const formattedDevices = nasDevices.map((nas) => ({
      id: nas.id,
      nasName: nas.nasName,
      shortName: nas.shortName,
      nasType: nas.nasType,
      ipAddress: nas.ipAddress,
      ports: nas.ports,
      secret: nas.secret,
      server: nas.server,
      community: nas.community,
      description: nas.description,
      status: nas.status,
      lastAlive: nas.lastAlive,
      vendor: nas.vendor,
      model: nas.model,
      location: nas.location,
      contact: nas.contact,
      createdAt: nas.createdAt,
      updatedAt: nas.updatedAt,
      activeSessions: nas._count.acctRecords,
    }))

    return NextResponse.json({
      devices: formattedDevices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: totalCount,
        online: onlineCount,
        offline: offlineCount,
        totalActiveSessions,
      },
    })
  } catch (error) {
    console.error('Error fetching NAS devices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NAS devices' },
      { status: 500 }
    )
  }
}

// POST /api/nas - Create a new NAS device
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      nasName,
      shortName,
      nasType,
      ipAddress,
      ports,
      secret,
      server,
      community,
      description,
      vendor,
      model,
      location,
      contact,
    } = body

    // Validate required fields
    if (!nasName || !nasName.trim()) {
      return NextResponse.json(
        { error: 'NAS name is required' },
        { status: 400 }
      )
    }

    if (!ipAddress || !ipAddress.trim()) {
      return NextResponse.json(
        { error: 'IP address is required' },
        { status: 400 }
      )
    }

    // Basic IP address validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/
    if (!ipRegex.test(ipAddress.trim())) {
      return NextResponse.json(
        { error: 'Invalid IP address format' },
        { status: 400 }
      )
    }

    if (!secret || !secret.trim()) {
      return NextResponse.json(
        { error: 'RADIUS secret is required' },
        { status: 400 }
      )
    }

    // Check for duplicate IP address
    const existingNas = await db.nas.findUnique({
      where: { ipAddress: ipAddress.trim() },
    })

    if (existingNas) {
      return NextResponse.json(
        { error: 'A NAS device with this IP address already exists' },
        { status: 409 }
      )
    }

    const nas = await db.nas.create({
      data: {
        nasName: nasName.trim(),
        shortName: shortName?.trim() || null,
        nasType: nasType || 'other',
        ipAddress: ipAddress.trim(),
        ports: ports ? parseInt(ports) : 0,
        secret: secret.trim(),
        server: server?.trim() || null,
        community: community?.trim() || null,
        description: description?.trim() || null,
        vendor: vendor?.trim() || null,
        model: model?.trim() || null,
        location: location?.trim() || null,
        contact: contact?.trim() || null,
      },
    })

    return NextResponse.json({ device: nas }, { status: 201 })
  } catch (error) {
    console.error('Error creating NAS device:', error)
    return NextResponse.json(
      { error: 'Failed to create NAS device' },
      { status: 500 }
    )
  }
}
