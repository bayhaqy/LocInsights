import { NextRequest, NextResponse } from 'next/server'
import { db, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const p = await db.poi.findUnique({ where: { id } })
    if (!p) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: p })
  } catch (e) { return handleError(e) }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    delete body.id
    const p = await db.poi.update({ where: { id }, data: body })
    return NextResponse.json({ success: true, data: p })
  } catch (e) { return handleError(e) }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.poi.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) { return handleError(e) }
}
