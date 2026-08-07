import { NextRequest, NextResponse } from 'next/server'
import { scoreAllKelurahan, getTopOpportunities, type ScoringConfig } from '@/lib/scoring/engine'

export const dynamic = 'force-dynamic'

/**
 * GET /api/locinsight/opportunities?brand_id=&tier=&limit=&min_score=
 * Returns sorted list of expansion opportunities.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const brandId = sp.get('brand_id') || undefined
  const tier = sp.get('tier') ? Number(sp.get('tier')) as 1 | 2 | 3 : undefined
  const limit = Number(sp.get('limit') || 100)
  const minScore = Number(sp.get('min_score') || 0)

  const config: ScoringConfig = { brand_id: brandId }
  let opps = getTopOpportunities(limit, config, tier)
  if (minScore > 0) opps = opps.filter(o => o.composite_score >= minScore)

  return NextResponse.json({
    success: true,
    filter: { brand_id: brandId || null, tier: tier || null, limit, min_score: minScore },
    count: opps.length,
    data: opps,
  })
}
