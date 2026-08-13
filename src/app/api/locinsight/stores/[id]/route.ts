import { NextRequest, NextResponse } from 'next/server'
import { db, handleError, filterModelFields } from '@/lib/api-helpers'

import { requireAuth, requireSuperadmin } from '@/lib/auth-server'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    const store = await db.store.findUnique({
      where: { id },
      include: { brands: true, malls: true },
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
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
        const body = filterModelFields('Store', await req.json())
    delete body.id
    const store = await db.store.update({
      where: { id },
      data: body,
      include: { brands: true, malls: true },
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
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  try {
    const { id } = await params
    await db.store.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleError(e)
  }
}
