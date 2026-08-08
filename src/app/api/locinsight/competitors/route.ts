import { NextRequest, NextResponse } from 'next/server'
import { db, paginate, handleError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/locinsight/competitors
 *
 * Query params:
 *   - paginated (default)   — page=1&page_size=50 (max 200) + optional search, kab, brand_name, brand_category
 *   - ?all=true              — returns up to 5000 rows in a single response (for analytics views)
 *
 * Response (paginated): { success, data[], total, page, page_size, total_pages }
 * Response (?all=true): { success, data[], count }
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const term = sp.get('search')
    const kab = sp.get('kab')
    const brand = sp.get('brand_name')
    const category = sp.get('brand_category')
    const all = sp.get('all') === 'true'

    const where: any = {}
    if (kab) where.kab = kab
    if (brand) where.brand_name = brand
    if (category) where.brand_category = category

    if (all) {
      // Single-shot full fetch for the Competitor Intel summary view.
      // Capped at 5000 to protect memory; for larger workloads use pagination.
      const data = await db.competitorStore.findMany({
        where,
        orderBy: [{ kab: 'asc' }, { brand_name: 'asc' }],
        take: 5000,
      })
      return NextResponse.json({ success: true, data, count: data.length })
    }

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
