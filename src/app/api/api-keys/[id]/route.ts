import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/api-keys/[id] - Update an API key
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.apiKey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, permissions, rateLimit, expiresAt, status } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (permissions !== undefined) {
      updateData.permissions = Array.isArray(permissions) ? permissions.join(',') : permissions
    }
    if (rateLimit !== undefined) updateData.rateLimit = parseInt(rateLimit) || 1000
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    if (status !== undefined) updateData.status = status

    const updated = await db.apiKey.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      apiKey: {
        id: updated.id,
        name: updated.name,
        keyHash: updated.keyHash,
        keyPrefix: updated.keyPrefix,
        adminId: updated.adminId,
        permissions: updated.permissions,
        rateLimit: updated.rateLimit,
        lastUsedAt: updated.lastUsedAt,
        expiresAt: updated.expiresAt,
        status: updated.status,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error) {
    console.error('Error updating API key:', error)
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
  }
}

// DELETE /api/api-keys/[id] - Revoke/delete an API key
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await db.apiKey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    await db.apiKey.delete({ where: { id } })

    return NextResponse.json({ message: 'API key deleted successfully', apiKeyId: id })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
  }
}
