import { NextRequest, NextResponse } from 'next/server'
import { db, paginate, handleError } from '@/lib/api-helpers'
import { requireSuperadmin } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// GET is public (no auth) — countries are shared reference data.
// The middleware matcher excludes /api/locinsight/countries from the auth
// requirement. POST/PUT/DELETE below still require superadmin.
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
    const auth = await requireSuperadmin()
    if (!auth.ok) return auth.response

    const body = await req.json()
    const c = await db.country.create({ data: body })
    return NextResponse.json({ success: true, data: c }, { status: 201 })
  } catch (e) { return handleError(e) }
}
