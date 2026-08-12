import { NextRequest, NextResponse } from 'next/server'
import { db, paginate, handleError } from '@/lib/api-helpers'

import { requireAuth, requireSuperadmin } from '@/lib/auth-server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  try {
    const sp = req.nextUrl.searchParams
    const term = sp.get('search')
    const kab = sp.get('kab')
    const parent = sp.get('parent')
    const confirmed = sp.get('confirmed')

    const where: any = {}
    if (kab) where.kab = kab
    if (parent) where.parent = parent
    if (confirmed === 'true') where.confirmed = true
    if (confirmed === 'false') where.confirmed = false

    return paginate(db.store, req, {
      where,
      include: { brands: true, malls: true },
      orderBy: { id: 'asc' },
      search: { fields: ['name', 'brand_name', 'address'], term },
    })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json()
    const store = await db.store.create({
      data: body,
      include: { brands: true, malls: true },
    })
    return NextResponse.json({ success: true, data: store }, { status: 201 })
  } catch (e) {
    return handleError(e)
  }
}
