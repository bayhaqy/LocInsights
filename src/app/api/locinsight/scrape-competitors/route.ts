/**
 * Competitor Scraper — Phase 2 feature.
 *
 * Searches OpenStreetMap for predefined competitor brand outlets within Bali bbox.
 * Uses Overpass API with brand tag filters. Returns results for review-then-save
 * (same workflow as the regular scraper).
 *
 * POST /api/locinsight/scrape-competitors
 *   body: { brands?: string[], save?: false }
 *   returns: { results: [...], total_found, source }
 *
 * GET /api/locinsight/scrape-competitors — list all competitor stores in DB
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isOnBaliLand } from '@/lib/data/bali-land'
import { COMPETITOR_BRANDS, BALI_BBOX } from '@/lib/data/competitor-brands'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const USER_AGENT = 'LocInsight/1.0 (MAP Active Adiperkasa Data Team)'

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

async function runOverpass(query: string): Promise<OverpassElement[]> {
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ]
  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) continue
      const data = await res.json() as { elements: OverpassElement[] }
      return data.elements || []
    } catch (e) {
      console.warn(`Overpass ${endpoint} failed:`, e)
    }
  }
  return []
}

interface ScrapedCompetitor {
  brand_name: string
  brand_category: string
  name: string
  lat: number
  lng: number
  kec: string
  kab: string
  city: string
  address: string
  is_in_mall: boolean
  mall_name: string | null
  on_land: boolean
  source: string
}

/**
 * Scrape competitors for given brands (defaults to all). Returns for review.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const requestedBrands = Array.isArray(body.brands) ? body.brands : null
    const brandsToScrape = requestedBrands
      ? COMPETITOR_BRANDS.filter(b => requestedBrands.includes(b.name))
      : COMPETITOR_BRANDS

    if (brandsToScrape.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching brands to scrape' }, { status: 400 })
    }

    const [s, w, n, e] = BALI_BBOX
    const bboxStr = `${s},${w},${n},${e}`

    const allResults: ScrapedCompetitor[] = []
    let usedFallback = false

    for (const brand of brandsToScrape) {
      // Try Overpass first
      const tagClauses = brand.osm_tags.map(tag => {
        return `node[${tag}](${bboxStr});way[${tag}](${bboxStr});`
      }).join('')
      const query = `[out:json][timeout:25];(${tagClauses});out center 200;`
      let elements = await runOverpass(query)

      // If Overpass returns nothing, fallback: skip (don't hammer Nominatim for 26 brands × 5 sec)
      if (elements.length === 0) {
        usedFallback = true
        continue
      }

      for (const el of elements) {
        const elat = el.lat ?? el.center?.lat
        const elng = el.lon ?? el.center?.lon
        if (elat == null || elng == null) continue
        const onLand = isOnBaliLand(elat, elng, 1)
        const tags = el.tags || {}
        const outletName = tags.name || `${brand.name} ${tags['addr:street'] || tags['addr:city'] || el.id}`
        const addressParts = [
          tags['addr:street'],
          tags['addr:housenumber'],
          tags['addr:city'],
          tags['addr:suburb'],
        ].filter(Boolean).join(' ')

        allResults.push({
          brand_name: brand.name,
          brand_category: brand.category,
          name: outletName,
          lat: elat,
          lng: elng,
          kec: tags['addr:suburb'] || '',
          kab: tags['addr:county'] || tags['addr:state'] || '',
          city: tags['addr:city'] || '',
          address: addressParts || '',
          is_in_mall: false, // unknown without further processing
          mall_name: null,
          on_land: onLand,
          source: `OSM Overpass: brand="${brand.name}" — ${new Date().toISOString()}`,
        })
      }
    }

    // Dedupe by lat+lng (rounded to 5 decimal places — ~1m)
    const seen = new Set<string>()
    const deduped = allResults.filter(r => {
      const key = `${r.lat.toFixed(5)}_${r.lng.toFixed(5)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({
      success: true,
      total_found: deduped.length,
      source: usedFallback ? 'overpass_partial' : 'overpass',
      brands_scraped: brandsToScrape.map(b => b.name),
      results: deduped,
      review_required: true,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Scrape failed' }, { status: 500 })
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
