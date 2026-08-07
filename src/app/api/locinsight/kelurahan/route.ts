import { NextRequest, NextResponse } from 'next/server'
import { db, paginate, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const term = sp.get('search')
    const kab = sp.get('kab')
    const tier = sp.get('tier')

    const where: any = {}
    if (kab) where.kab_name = kab
    if (tier) where.tier = Number(tier)

    return paginate(db.kelurahan, req, {
      where,
      orderBy: { id: 'asc' },
      search: { fields: ['name', 'kec_name', 'kab_name'], term },
    })
  } catch (e) { return handleError(e) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const k = await db.kelurahan.create({ data: body })
    return NextResponse.json({ success: true, data: k }, { status: 201 })
  } catch (e) { return handleError(e) }
}
