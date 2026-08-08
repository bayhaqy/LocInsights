/**
 * Competitor Scraper — DEPRECATED but kept for backward compat.
 *
 * POST /api/locinsight/scrape-competitors
 *   body: { brands?: string[], location?: {kab_code?, kec_code?, kel_code?} }
 *   returns: { success, results, total_found, brands_with_data, brands_scraped, source }
 *
 * This is now a thin wrapper around the shared scraper-engine (brand mode).
 * The unified scraper UI also exposes brand-sweep mode directly via /scrape.
 *
 * GET /api/locinsight/scrape-competitors — list all competitor stores in DB
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runScrape } from '@/lib/scraper-engine'
import type { ScrapeRequest } from '@/lib/scraper-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const scrapeReq: ScrapeRequest = {
      mode: 'brand',
      brands: Array.isArray(body.brands) ? body.brands : undefined,
      location: body.location || undefined,
    }

    const result = await runScrape(scrapeReq)

    return NextResponse.json({
      success: true,
      total_found: result.results.length,
      source: result.source,
      brands_with_data: result.meta.brands_with_data || 0,
      brands_scraped: result.meta.brands_scraped || [],
      results: result.results,
      meta: result.meta,
      review_required: true,
    })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message || 'Scrape failed', total_found: 0, results: [] },
      { status: 502 },
    )
  }
}

/**
 * GET /api/locinsight/scrape-competitors — list all competitor stores currently in DB
 * Optional: ?brand_name=Indomaret for filtering
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const brandName = sp.get('brand_name')
    const where = brandName ? { brand_name: brandName } : {}
    const competitors = await prisma.competitorStore.findMany({
      where,
      orderBy: [{ kab: 'asc' }, { brand_name: 'asc' }],
      take: 1000,
    })
    return NextResponse.json({
      success: true,
      count: competitors.length,
      data: competitors,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
