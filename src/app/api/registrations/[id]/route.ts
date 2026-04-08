import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/registrations/[id] - Get single registration details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const registration = await db.registration.findUnique({
      where: { id },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(registration)
  } catch (error) {
    console.error('Error fetching registration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registration' },
      { status: 500 }
    )
  }
}

// PUT /api/registrations/[id] - Approve/reject registration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action, approvedBy, rejectReason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const registration = await db.registration.findUnique({
      where: { id },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    if (registration.status !== 'pending') {
      return NextResponse.json(
        { error: `Registration is already ${registration.status}` },
        { status: 400 }
      )
    }

    if (action === 'reject') {
      const updated = await db.registration.update({
        where: { id },
        data: {
          status: 'rejected',
          approvedBy,
          rejectReason: rejectReason || 'No reason provided',
          approvedAt: new Date(),
        },
      })
      return NextResponse.json(updated)
    }

    // Approve: create a RadUser from the registration
    // Check if username already exists in RadUser
    const existingUser = await db.radUser.findUnique({
      where: { username: registration.username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists as a RADIUS user' },
        { status: 409 }
      )
    }

    // Create the RadUser
    const user = await db.radUser.create({
      data: {
        username: registration.username,
        password: registration.password,
        fullName: registration.fullName,
        email: registration.email,
        phone: registration.phone,
        company: registration.company,
        address: registration.address,
        checkAttrs: {
          create: {
            attribute: 'Cleartext-Password',
            op: ':=',
            value: registration.password,
          },
        },
      },
    })

    // Update registration status
    const updated = await db.registration.update({
      where: { id },
      data: {
        status: 'completed',
        approvedBy,
        approvedAt: new Date(),
        verifiedAt: new Date(),
      },
    })

    return NextResponse.json({ registration: updated, user })
  } catch (error) {
    console.error('Error updating registration:', error)
    return NextResponse.json(
      { error: 'Failed to update registration' },
      { status: 500 }
    )
  }
}
