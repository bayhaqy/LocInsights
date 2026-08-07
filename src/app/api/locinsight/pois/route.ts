import { NextRequest, NextResponse } from 'next/server'
import { db, paginate, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const term = sp.get('search')
    const type = sp.get('type')
    const kab = sp.get('kab')

    const where: any = {}
    if (type) where.type = type
    if (kab) where.kab = kab

    return paginate(db.poi, req, {
      where,
      orderBy: { id: 'asc' },
      search: { fields: ['name', 'kec', 'kab', 'notes'], term },
    })
  } catch (e) { return handleError(e) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const p = await db.poi.create({ data: body })
    return NextResponse.json({ success: true, data: p }, { status: 201 })
  } catch (e) { return handleError(e) }
}
