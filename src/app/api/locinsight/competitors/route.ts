import { NextRequest, NextResponse } from 'next/server'
import { db, paginate, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const term = sp.get('search')
    const kab = sp.get('kab')
    const brand = sp.get('brand_name')
    const category = sp.get('brand_category')

    const where: any = {}
    if (kab) where.kab = kab
    if (brand) where.brand_name = brand
    if (category) where.brand_category = category

    return paginate(db.competitorStore, req, {
      where,
      orderBy: [{ kab: 'asc' }, { brand_name: 'asc' }],
      search: { fields: ['name', 'brand_name', 'address', 'kec', 'kab'], term },
    })
  } catch (e) {
    return handleError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const competitor = await db.competitorStore.create({ data: body })
    return NextResponse.json({ success: true, data: competitor }, { status: 201 })
  } catch (e) {
    return handleError(e)
  }
}
