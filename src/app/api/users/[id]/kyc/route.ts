import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/users/[id]/kyc - Get user KYC status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.radUser.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        kycStatus: true,
        kycVerifiedAt: true,
        kycVerifiedBy: true,
        kycNotes: true,
        idType: true,
        idNumber: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get document summary
    const documents = await db.userDocument.findMany({
      where: { userId: id },
      select: { id: true, docType: true, status: true },
    })

    const documentSummary = {
      total: documents.length,
      pending: documents.filter((d) => d.status === 'pending').length,
      approved: documents.filter((d) => d.status === 'approved').length,
      rejected: documents.filter((d) => d.status === 'rejected').length,
      types: documents.reduce((acc, d) => {
        acc[d.docType] = d.status
        return acc
      }, {} as Record<string, string>),
    }

    return NextResponse.json({
      ...user,
      documents: documentSummary,
    })
  } catch (error) {
    console.error('Error fetching KYC status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KYC status' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id]/kyc - Update KYC status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { kycStatus, kycVerifiedBy, kycNotes, idType, idNumber } = body

    const validStatuses = ['pending', 'submitted', 'verified', 'rejected']
    if (kycStatus && !validStatuses.includes(kycStatus)) {
      return NextResponse.json(
        { error: `Invalid KYC status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (kycStatus) {
      updateData.kycStatus = kycStatus
      if (kycStatus === 'verified') {
        updateData.kycVerifiedAt = new Date()
        updateData.kycVerifiedBy = kycVerifiedBy || 'admin'
      }
    }
    if (kycNotes !== undefined) updateData.kycNotes = kycNotes
    if (idType !== undefined) updateData.idType = idType
    if (idNumber !== undefined) updateData.idNumber = idNumber

    const user = await db.radUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        kycStatus: true,
        kycVerifiedAt: true,
        kycVerifiedBy: true,
        kycNotes: true,
        idType: true,
        idNumber: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating KYC status:', error)
    return NextResponse.json(
      { error: 'Failed to update KYC status' },
      { status: 500 }
    )
  }
}
