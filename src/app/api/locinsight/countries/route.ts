import { NextRequest, NextResponse } from 'next/server'
import { db, paginate, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const term = sp.get('search')

    return paginate(db.country, req, {
      orderBy: { id: 'asc' },
      search: { fields: ['name'], term },
    })
  } catch (e) { return handleError(e) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const c = await db.country.create({ data: body })
    return NextResponse.json({ success: true, data: c }, { status: 201 })
  } catch (e) { return handleError(e) }
}
