import { NextRequest, NextResponse } from 'next/server'
import { db, paginate, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const term = sp.get('search')
    const countryId = sp.get('country_id')

    const where: any = {}
    if (countryId) where.country_id = countryId

    return paginate(db.province, req, {
      where,
      orderBy: { code: 'asc' },
      search: { fields: ['name', 'country'], term },
    })
  } catch (e) { return handleError(e) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const p = await db.province.create({ data: body })
    return NextResponse.json({ success: true, data: p }, { status: 201 })
  } catch (e) { return handleError(e) }
}
