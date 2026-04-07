import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/users/[id]/photo - Get user profile photo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.radUser.findUnique({
      where: { id },
      select: { id: true, username: true, profilePhoto: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      userId: user.id,
      username: user.username,
      profilePhoto: user.profilePhoto,
    })
  } catch (error) {
    console.error('Error fetching profile photo:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile photo' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id]/photo - Update profile photo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { profilePhoto } = body

    if (!profilePhoto) {
      return NextResponse.json(
        { error: 'Profile photo data is required' },
        { status: 400 }
      )
    }

    const user = await db.radUser.update({
      where: { id },
      data: { profilePhoto },
      select: { id: true, username: true, profilePhoto: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating profile photo:', error)
    return NextResponse.json(
      { error: 'Failed to update profile photo' },
      { status: 500 }
    )
  }
}
