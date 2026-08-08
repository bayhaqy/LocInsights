/**
 * Competitor Scraper — searches OpenStreetMap for predefined competitor brand outlets.
 *
 * Best practices (Aug 2026):
 *   - Use Overpass API with brand tag filters (faster + more accurate than Nominatim search)
 *   - Reverse-geocode kabupaten via point-in-polygon against our kelurahan dataset (no API call)
 *   - Improve outlet name with location context (e.g., "Indomaret — Kuta" instead of just "Indomaret")
 *   - Land validation per result so UI can show ✓/✗
 *   - Results returned for review-then-save (no auto-save)
 *
 * POST /api/locinsight/scrape-competitors
 *   body: { brands?: string[] }
 *   returns: { results: [...], total_found, source }
 *
 * GET /api/locinsight/scrape-competitors — list all competitor stores in DB
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isOnBaliLand } from '@/lib/data/bali-land'
import { haversineKm } from '@/lib/data/bali-kelurahan'
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
    'https://overpass.osm.ch/api/interpreter',
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
 * Cache kelurahan list once for reverse-geocoding (kabupaten lookup via nearest neighbor).
 * Loads from DB; falls back to empty list if not seeded.
 */
let kelurahanCache: Array<{ id: string; name: string; kec_name: string; kab_name: string; lat: number; lng: number }> | null = null
async function getKelurahanCache(): Promise<Array<{ id: string; name: string; kec_name: string; kab_name: string; lat: number; lng: number }>> {
  if (kelurahanCache !== null) return kelurahanCache
  try {
    const rows = await prisma.kelurahan.findMany({
      select: { id: true, name: true, kec_name: true, kab_name: true, lat: true, lng: true },
      take: 5000,
    })
    kelurahanCache = rows.filter(k => k.lat != null && k.lng != null) as any
  } catch {
    kelurahanCache = []
  }
  return kelurahanCache as Array<{ id: string; name: string; kec_name: string; kab_name: string; lat: number; lng: number }>
}

/**
 * Find nearest kelurahan to a coordinate, return its kab_name + kec_name.
 * Used for reverse-geocoding competitor outlets without an API call.
 */
async function reverseGeocode(lat: number, lng: number): Promise<{ kec: string; kab: string; city: string; kelurahanName: string }> {
  const cache = await getKelurahanCache()
  if (cache.length === 0) return { kec: '', kab: '', city: '', kelurahanName: '' }

  let best: { kec: string; kab: string; city: string; kelurahanName: string } | null = null
  let bestDist = Infinity
  for (const k of cache) {
    const d = haversineKm(lat, lng, k.lat, k.lng)
    if (d < bestDist) {
      bestDist = d
      // Only use the kelurahan if it's within ~10km (otherwise the point is outside our data)
      if (d <= 10) {
        best = {
          kec: k.kec_name || '',
          kab: k.kab_name || '',
          city: k.kab_name || '',
          kelurahanName: k.name || '',
        }
      }
    }
  }
  return best || { kec: '', kab: '', city: '', kelurahanName: '' }
}
/**
 * Build a meaningful outlet name. Best practice (per Competitor Intel user feedback):
 * Use "Brand — Location Context" format so outlets are distinguishable in the UI.
 * Falls back to "Brand #OSM_ID" if no context available.
 */
function buildOutletName(brand: string, tags: Record<string, string>, geo: { kelurahanName: string; kec: string; kab: string }, osmId: number): string {
  // Priority: OSM name tag (if it's not just the brand) > brand + branch > brand + kelurahan > brand + kab > brand #id
  const osmName = tags.name || ''
  const branch = tags.branch || tags['brand:branch'] || tags['addr:branch'] || ''

  // If OSM name has more than just the brand (e.g., "Indomaret Kuta Square"), use it
  if (osmName && osmName.toLowerCase() !== brand.toLowerCase() && osmName.length > brand.length + 2) {
    return osmName
  }
  if (branch) return `${brand} — ${branch}`
  if (geo.kelurahanName) return `${brand} — ${geo.kelurahanName}`
  if (geo.kec) return `${brand} — ${geo.kec}`
  if (geo.kab) return `${brand} — ${geo.kab}`
  return `${brand} #${osmId}`
}

/**
 * Detect if a point is inside a known mall (within 250m of a mall center).
 */
async function detectMall(lat: number, lng: number): Promise<{ is_in_mall: boolean; mall_name: string | null }> {
  try {
    const malls = await prisma.mall.findMany({ select: { name: true, lat: true, lng: true } })
    for (const m of malls) {
      if (m.lat == null || m.lng == null) continue
      if (haversineKm(lat, lng, m.lat, m.lng) <= 0.25) {
        return { is_in_mall: true, mall_name: m.name }
      }
    }
  } catch {}
  return { is_in_mall: false, mall_name: null }
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
    let brandsWithData = 0

    for (const brand of brandsToScrape) {
      // Try Overpass first
      const tagClauses = brand.osm_tags.map(tag => {
        return `node[${tag}](${bboxStr});way[${tag}](${bboxStr});`
      }).join('')
      const query = `[out:json][timeout:25];(${tagClauses});out center 200;`
      const elements = await runOverpass(query)

      if (elements.length === 0) {
        usedFallback = true
        continue
      }
      brandsWithData += 1

      for (const el of elements) {
        const elat = el.lat ?? el.center?.lat
        const elng = el.lon ?? el.center?.lon
        if (elat == null || elng == null) continue
        const onLand = isOnBaliLand(elat, elng, 1)
        const tags = el.tags || {}
        const geo = await reverseGeocode(elat, elng)
        const mallInfo = await detectMall(elat, elng)
        const outletName = buildOutletName(brand.name, tags, geo, el.id)

        const addressParts = [
          tags['addr:street'],
          tags['addr:housenumber'],
          geo.kec,
          geo.kab,
        ].filter(Boolean).join(' ')

        allResults.push({
          brand_name: brand.name,
          brand_category: brand.category,
          name: outletName,
          lat: elat,
          lng: elng,
          kec: geo.kec,
          kab: geo.kab,
          city: geo.city,
          address: addressParts || '',
          is_in_mall: mallInfo.is_in_mall,
          mall_name: mallInfo.mall_name,
          on_land: onLand,
          source: `OSM Overpass: brand="${brand.name}" — ${new Date().toISOString()}`,
        })
      }
    }

    if (brandsWithData === 0) {
      return NextResponse.json({
        success: false,
        error: 'Overpass API returned no data for any of the selected brands. The OSM Overpass endpoints may be down or rate-limiting. Try again in a minute or select fewer brands.',
        total_found: 0,
        results: [],
      }, { status: 502 })
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
      brands_with_data: brandsWithData,
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
