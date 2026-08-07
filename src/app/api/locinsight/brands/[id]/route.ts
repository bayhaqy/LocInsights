import { NextRequest, NextResponse } from 'next/server'
import { db, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const b = await db.brand.findUnique({ where: { id }, include: { stores: true } })
    if (!b) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: b })
  } catch (e) { return handleError(e) }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    delete body.id
    delete body.stores
    const b = await db.brand.update({ where: { id }, data: body, include: { stores: true } })
    return NextResponse.json({ success: true, data: b })
  } catch (e) { return handleError(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.brand.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) { return handleError(e) }
}
