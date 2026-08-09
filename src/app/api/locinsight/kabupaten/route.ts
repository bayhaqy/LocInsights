import { NextRequest, NextResponse } from 'next/server'
import { db, paginate, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const term = sp.get('search')
    const tier = sp.get('tier')

    const where: any = {}
    // Tier is an enum (tier_1, tier_2, tier_3). Accept both "1" and "tier_1".
    if (tier) {
      const tierMap: Record<string, string> = { '1': 'tier_1', '2': 'tier_2', '3': 'tier_3' }
      where.tier = tierMap[tier] || tier
    }

    return paginate(db.kabupaten, req, {
      where,
      orderBy: { code: 'asc' },
      search: { fields: ['name', 'capital', 'notes'], term },
    })
  } catch (e) { return handleError(e) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const k = await db.kabupaten.create({ data: body })
    return NextResponse.json({ success: true, data: k }, { status: 201 })
  } catch (e) { return handleError(e) }
}
