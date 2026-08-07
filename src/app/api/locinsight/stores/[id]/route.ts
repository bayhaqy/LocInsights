import { NextRequest, NextResponse } from 'next/server'
import { db, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const store = await db.store.findUnique({
      where: { id },
      include: { brand: true, mall: true },
    })
    if (!store) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: store })
  } catch (e) {
    return handleError(e)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    delete body.id
    const store = await db.store.update({
      where: { id },
      data: body,
      include: { brand: true, mall: true },
    })
    return NextResponse.json({ success: true, data: store })
  } catch (e) {
    return handleError(e)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.store.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleError(e)
  }
}
