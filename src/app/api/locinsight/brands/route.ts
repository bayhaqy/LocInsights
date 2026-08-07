import { NextRequest, NextResponse } from 'next/server'
import { db, paginate, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const term = sp.get('search')
    const parent = sp.get('parent')
    const category = sp.get('category')

    const where: any = {}
    if (parent) where.parent = parent
    if (category) where.category = category

    return paginate(db.brand, req, {
      where,
      orderBy: { id: 'asc' },
      search: { fields: ['name', 'format', 'target_audience', 'origin_country'], term },
    })
  } catch (e) { return handleError(e) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const brand = await db.brand.create({ data: body })
    return NextResponse.json({ success: true, data: brand }, { status: 201 })
  } catch (e) { return handleError(e) }
}
