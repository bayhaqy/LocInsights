import { NextRequest, NextResponse } from 'next/server'
import { db, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const m = await db.mall.findUnique({ where: { id }, include: { stores: true } })
    if (!m) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: m })
  } catch (e) { return handleError(e) }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    delete body.id
    delete body.stores
    const m = await db.mall.update({ where: { id }, data: body, include: { stores: true } })
    return NextResponse.json({ success: true, data: m })
  } catch (e) { return handleError(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.mall.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) { return handleError(e) }
}
