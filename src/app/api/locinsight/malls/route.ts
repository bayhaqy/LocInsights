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
    const klass = sp.get('class')

    const where: any = {}
    if (kab) where.kab = kab
    if (klass) where.class = klass

    return paginate(db.mall, req, {
      where,
      include: { stores: true },
      orderBy: { id: 'asc' },
      search: { fields: ['name', 'kec', 'kab'], term },
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
    const { stores, ...mallData } = body
    const mall = await db.mall.create({
      data: mallData,
      include: { stores: true },
    })
    return NextResponse.json({ success: true, data: mall }, { status: 201 })
  } catch (e) {
    return handleError(e)
  }
}
