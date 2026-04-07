import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/users/[id]/documents - List user documents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const documents = await db.userDocument.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Error listing documents:', error)
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    )
  }
}

// POST /api/users/[id]/documents - Upload document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { docType, docName, fileName, filePath, fileSize, mimeType } = body

    if (!docType || !fileName || !filePath) {
      return NextResponse.json(
        { error: 'Document type, file name, and file data are required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await db.radUser.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const validDocTypes = ['id_proof', 'address_proof', 'photo', 'contract', 'other']
    if (!validDocTypes.includes(docType)) {
      return NextResponse.json(
        { error: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const document = await db.userDocument.create({
      data: {
        userId: id,
        username: user.username,
        docType,
        docName: docName || fileName,
        fileName,
        filePath,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/octet-stream',
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}
