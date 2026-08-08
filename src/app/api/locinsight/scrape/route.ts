/**
 * Data Scraper — uses free OpenStreetMap APIs:
 *   - Nominatim: geocoding (place name → lat/lng)
 *   - Overpass API: query POIs within a region
 *
 * Best practices (Aug 2026):
 *   - Nominatim usage policy: max 1 req/sec, valid User-Agent
 *   - Overpass: prefer public instance, retry with backoff
 *   - All results returned for review; user selects which to save via /scrape-save
 *   - Land validation per result so UI can show ✓/✗ for the user
 *
 * Sources:
 *   - https://nominatim.org/release-docs/latest/api/Search/ (Aug 2026)
 *   - https://wiki.openstreetmap.org/wiki/Overpass_API (Aug 2026)
 *   - https://taginfo.openstreetmap.org/ for shop/amenity tags
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, handleError } from '@/lib/api-helpers'
import { isOnBaliLand } from '@/lib/data/bali-land'
import type { ScraperResultRow, GeocodedResult } from '@/lib/scraper-types'

export type { ScraperResultRow, GeocodedResult }

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // allow up to 60s for scraping

const USER_AGENT = 'LocInsight/1.0 (MAP Active Adiperkasa Data Team)'

interface NominatimResult {
  place_id: number
  lat: string
  lon: string
  display_name: string
  type: string
  class: string
  address?: {
    village?: string
    town?: string
    city?: string
    county?: string
    state?: string
    country?: string
  }
  boundingbox?: [string, string, string, string]
  tags?: Record<string, string>
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

/**
 * Geocode a place name to coordinates using Nominatim.
 */
async function geocode(query: string): Promise<NominatimResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&countrycodes=id&viewbox=114.4,-8.05,115.7,-8.85&bounded=1`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'id,en' },
  })
  if (!res.ok) {
    throw new Error(`Nominatim ${res.status}: ${await res.text()}`)
  }
  const data = (await res.json()) as NominatimResult[]
  return data[0] || null
}

/**
 * Search for shops/POIs by name using Nominatim (fallback when Overpass is unreachable).
 * NOTE: Nominatim doesn't support boolean OR — we issue multiple simple queries.
 * The original `query` is always tried first (most relevant), then narrow by category.
 */
async function nominatimSearchByName(query: string, kind: 'store' | 'mall' | 'poi'): Promise<NominatimResult[]> {
  const kindQueries: Record<string, string[]> = {
    store: [query, `${query} cafe`, `${query} restaurant`],
    mall: [query, `${query} mall`, `${query} shopping`],
    poi: [query, `${query} hotel`, `${query} attraction`, `${query} beach`],
  }
  const queries = kindQueries[kind] || [query]
  const all: NominatimResult[] = []
  const seen = new Set<number>()
  for (const q of queries) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=20&countrycodes=id&viewbox=114.4,-8.05,115.7,-8.85&bounded=1&addressdetails=1`
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'id,en' },
      })
      if (!res.ok) continue
      const data = (await res.json()) as NominatimResult[]
      for (const r of data) {
        if (!seen.has(r.place_id)) {
          seen.add(r.place_id)
          all.push(r)
        }
      }
      // Nominatim rate limit: 1 req/sec — wait 1.1s between queries
      if (queries.indexOf(q) < queries.length - 1) {
        await new Promise(r => setTimeout(r, 1100))
      }
    } catch {
      // ignore — try next query
    }
  }
  return all
}

function buildOverpassQuery(bbox: [number, number, number, number], kind: 'store' | 'mall' | 'poi'): string {
  const [s, w, n, e] = bbox
  const bboxStr = `${s},${w},${n},${e}`
  const tagFilters: string[] = []
  if (kind === 'store') {
    tagFilters.push(
      'node["amenity"~"cafe|restaurant|fast_food|bar|pub"](bbox);',
      'node["shop"~"clothes|shoes|sports|jewelry|beauty|bakery|confectionery|coffee|bag|fashion_accessories"](bbox);',
      'way["amenity"~"cafe|restaurant|fast_food|bar|pub"](bbox);',
      'way["shop"~"clothes|shoes|sports|jewelry|beauty|bakery|confectionery|coffee|bag|fashion_accessories"](bbox);',
    )
  } else if (kind === 'mall') {
    tagFilters.push(
      'node["shop"="mall"](bbox);',
      'way["shop"="mall"](bbox);',
      'relation["shop"="mall"](bbox);',
      'way["building"="retail"](bbox);',
    )
  } else {
    tagFilters.push(
      'node["tourism"~"hotel|attraction|museum|gallery|theme_park|zoo"](bbox);',
      'way["tourism"~"hotel|attraction|museum|gallery|theme_park|zoo"](bbox);',
      'node["leisure"~"park|sports_centre|stadium|swimming_pool|beach_resort"](bbox);',
      'node["amenity"~"university|hospital|bus_station|ferry_terminal|cinema|theatre"](bbox);',
      'node["natural"="beach"](bbox);',
      'way["natural"="beach"](bbox);',
    )
  }
  const query = `[out:json][timeout:25];(${tagFilters.join('')});out center 200;`
  return query.replace(/bbox/g, bboxStr)
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
      const timeout = setTimeout(() => controller.abort(), 12000)
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

function elementName(tags: Record<string, string>, fallback: string): string {
  return tags.name || tags.brand || tags['name:en'] || tags.operator || fallback
}

function classifyPoi(tags: Record<string, string>): { type: string; magnitude: number; notes: string } {
  if (tags.natural === 'beach') return { type: 'beach', magnitude: 100_000, notes: `Beach (${tags.name || 'unnamed'})` }
  if (tags.tourism === 'hotel') return { type: 'hotel_cluster', magnitude: 100, notes: `Hotel: ${tags.name || ''}` }
  if (tags.tourism) return { type: 'tourist_attraction', magnitude: 50_000, notes: `Tourism: ${tags.tourism} — ${tags.name || ''}` }
  if (tags.amenity === 'hospital') return { type: 'hospital', magnitude: 400, notes: `Hospital: ${tags.name || ''}` }
  if (tags.amenity === 'university') return { type: 'university', magnitude: 10_000, notes: `University: ${tags.name || ''}` }
  if (tags.amenity === 'cinema' || tags.amenity === 'theatre') return { type: 'tourist_attraction', magnitude: 1_500, notes: `${tags.amenity}: ${tags.name || ''}` }
  if (tags.amenity === 'bus_station') return { type: 'transit_hub', magnitude: 5_000, notes: `Bus station: ${tags.name || ''}` }
  if (tags.amenity === 'ferry_terminal') return { type: 'port', magnitude: 5_000, notes: `Ferry terminal: ${tags.name || ''}` }
  if (tags.leisure === 'sports_centre' || tags.leisure === 'stadium') return { type: 'tourist_attraction', magnitude: 800, notes: `${tags.leisure}: ${tags.name || ''}` }
  if (tags.leisure === 'park') return { type: 'tourist_attraction', magnitude: 2_000, notes: `Park: ${tags.name || ''}` }
  return { type: 'tourist_attraction', magnitude: 1000, notes: `Other: ${tags.name || ''}` }
}

function classifyStore(tags: Record<string, string>): { brand_category: string; brand_name: string } | null {
  const name = (tags.name || tags.brand || '').toLowerCase()

  if (name.includes('starbucks')) return { brand_category: 'food_beverage', brand_name: 'Starbucks' }
  if (name.includes('pizza marzano') || name.includes('pizza hut')) return { brand_category: 'food_beverage', brand_name: 'Pizza Marzano' }
  if (name.includes('krispy kreme')) return { brand_category: 'food_beverage', brand_name: 'Krispy Kreme' }
  if (name.includes('godiva')) return { brand_category: 'food_beverage', brand_name: 'Godiva' }
  if (name.includes('sushi tei')) return { brand_category: 'food_beverage', brand_name: 'Sushi Tei' }
  if (name.includes('genki sushi')) return { brand_category: 'food_beverage', brand_name: 'Genki Sushi' }
  if (name.includes('subway')) return { brand_category: 'food_beverage', brand_name: 'Subway' }
  if (name.includes('popeyes')) return { brand_category: 'food_beverage', brand_name: 'Popeyes' }
  if (name.includes('cold stone')) return { brand_category: 'food_beverage', brand_name: 'Cold Stone Creamery' }
  if (name.includes('hoka')) return { brand_category: 'sports', brand_name: 'Hoka' }
  if (name.includes('skechers')) return { brand_category: 'sports', brand_name: 'Skechers' }
  if (name.includes('reebok')) return { brand_category: 'sports', brand_name: 'Reebok' }
  if (name.includes('nike')) return { brand_category: 'sports', brand_name: 'Nike' }
  if (name.includes('adidas')) return { brand_category: 'sports', brand_name: 'Adidas' }
  if (name.includes('puma')) return { brand_category: 'sports', brand_name: 'Puma' }
  if (name.includes('converse')) return { brand_category: 'sports', brand_name: 'Converse' }
  if (name.includes('vans')) return { brand_category: 'sports', brand_name: 'Vans' }
  if (name.includes('new balance')) return { brand_category: 'sports', brand_name: 'New Balance' }
  if (name.includes('foot locker')) return { brand_category: 'sports', brand_name: 'Foot Locker' }
  if (name.includes('sports station') || name.includes('planet sports')) return { brand_category: 'sports', brand_name: name.includes('planet') ? 'Planet Sports' : 'Sports Station' }
  if (name.includes('zara')) return { brand_category: 'fashion', brand_name: 'Zara' }
  if (name.includes('marks & spencer') || name.includes('marks and spencer')) return { brand_category: 'fashion', brand_name: 'Marks & Spencer' }
  if (name.includes('sogo')) return { brand_category: 'department_store', brand_name: 'Sogo' }
  if (name.includes('matahari')) return { brand_category: 'department_store', brand_name: 'Matahari Dept Store' }

  if (tags.shop === 'clothes' || tags.shop === 'fashion_accessories') return { brand_category: 'fashion', brand_name: tags.name || 'Fashion Store' }
  if (tags.shop === 'shoes') return { brand_category: 'sports', brand_name: tags.name || 'Shoe Store' }
  if (tags.shop === 'sports') return { brand_category: 'sports', brand_name: tags.name || 'Sports Store' }
  if (tags.shop === 'beauty') return { brand_category: 'beauty', brand_name: tags.name || 'Beauty Store' }
  if (tags.shop === 'mall') return { brand_category: 'department_store', brand_name: tags.name || 'Mall' }
  if (tags.amenity === 'cafe' || tags.shop === 'coffee') return { brand_category: 'food_beverage', brand_name: tags.name || 'Cafe' }
  if (tags.amenity === 'restaurant') return { brand_category: 'food_beverage', brand_name: tags.name || 'Restaurant' }
  if (tags.amenity === 'fast_food') return { brand_category: 'food_beverage', brand_name: tags.name || 'Fast Food' }
  if (tags.amenity === 'bar' || tags.amenity === 'pub') return { brand_category: 'food_beverage', brand_name: tags.name || 'Bar' }

  return null
}

/**
 * Shared scrape function — used by POST here and by /scrape-save endpoint.
 * Does NOT save anything; just returns results for review.
 */
export async function runScrape(
  query: string,
  kind: 'store' | 'mall' | 'poi' | 'all' = 'all',
  radius_km = 5,
): Promise<{
  geocoded: GeocodedResult
  used_fallback: boolean
  source: string
  results: ScraperResultRow[]
}> {
  const geo = await geocode(query)
  if (!geo) {
    throw new Error('Place not found — try a more specific query')
  }

  const lat = parseFloat(geo.lat)
  const lng = parseFloat(geo.lon)
  const isBali = isOnBaliLand(lat, lng, 2)

  const dLat = radius_km / 111
  const dLng = radius_km / (111 * Math.cos((lat * Math.PI) / 180))
  const bbox: [number, number, number, number] = [lat - dLat, lng - dLng, lat + dLat, lng + dLng]

  const kinds: Array<'store' | 'mall' | 'poi'> = kind === 'all' ? ['store', 'mall', 'poi'] : [kind]
  const allElements: Array<{ element: OverpassElement; kind: 'store' | 'mall' | 'poi' }> = []

  for (const k of kinds) {
    const q = buildOverpassQuery(bbox, k)
    const elements = await runOverpass(q)
    for (const element of elements) {
      allElements.push({ element, kind: k })
    }
  }

  let usedFallback = false
  if (allElements.length === 0) {
    usedFallback = true
    for (const k of kinds) {
      const nomResults = await nominatimSearchByName(query, k)
      for (const r of nomResults) {
        allElements.push({
          element: {
            type: 'node',
            id: r.place_id,
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            tags: {
              name: r.display_name.split(',')[0],
              ...(r.class === 'amenity' ? { amenity: r.type } : {}),
              ...(r.class === 'shop' ? { shop: r.type } : {}),
              ...(r.class === 'tourism' ? { tourism: r.type } : {}),
              ...(r.class === 'leisure' ? { leisure: r.type } : {}),
              ...(r.class === 'natural' ? { natural: r.type } : {}),
            },
          },
          kind: k,
        })
      }
    }
  }

  const results: ScraperResultRow[] = []
  for (const { element, kind: elKind } of allElements) {
    const elat = element.lat ?? element.center?.lat
    const elng = element.lon ?? element.center?.lon
    if (elat == null || elng == null) continue

    const tags = element.tags || {}
    const name = elementName(tags, `${elKind}_${element.id}`)
    const onLand = isOnBaliLand(elat, elng, 1)
    const address = tags['addr:street']
      ? `${tags['addr:street']}${tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''}${tags['addr:city'] ? ', ' + tags['addr:city'] : ''}`.trim()
      : geo.display_name

    let category = 'unknown'
    let brand_name: string | undefined
    let brand_category: string | undefined
    let poi_type: string | undefined
    let poi_magnitude: number | undefined
    let poi_notes: string | undefined

    if (elKind === 'store') {
      const cls = classifyStore(tags)
      if (cls) {
        category = `${cls.brand_name} (${cls.brand_category})`
        brand_name = cls.brand_name
        brand_category = cls.brand_category
      } else {
        category = `Unknown store: ${name}`
      }
    } else if (elKind === 'mall') {
      category = `Mall: ${name}`
    } else {
      const cls = classifyPoi(tags)
      category = `${cls.type}: ${name}`
      poi_type = cls.type
      poi_magnitude = cls.magnitude
      poi_notes = cls.notes
    }

    results.push({
      name,
      type: category,
      lat: elat,
      lng: elng,
      category,
      kind: elKind,
      tags,
      on_land: onLand,
      address,
      brand_name,
      brand_category,
      poi_type,
      poi_magnitude,
      poi_notes,
      source: `OSM scrape: "${query}" — ${new Date().toISOString()}`,
    })
  }

  return {
    geocoded: { lat, lng, display_name: geo.display_name, is_in_bali: isBali, address: geo.address },
    used_fallback: usedFallback,
    source: usedFallback ? 'nominatim_only' : 'nominatim+overpass',
    results,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, kind = 'all', radius_km = 5 } = body as {
      query: string
      kind?: 'store' | 'mall' | 'poi' | 'all'
      radius_km?: number
    }
    // NOTE: save is intentionally NOT supported here anymore.
    // The user reviews results in the UI, then POSTs the selected ones to /scrape-save.
    // We still accept `save` in the body for backwards compatibility but ignore it.

    if (!query) {
      return NextResponse.json({ success: false, error: 'query is required' }, { status: 400 })
    }

    const scrapeResult = await runScrape(query, kind, radius_km)

    // Log scraper run with results for later review (no DB writes to master tables)
    const run = await db.scraperRun.create({
      data: {
        query,
        source: scrapeResult.source as any,
        status: 'success',
        found_count: scrapeResult.results.length,
        saved_count: 0, // 0 because we don't auto-save anymore
        result_json: JSON.stringify(scrapeResult.results.slice(0, 500)),
        finished_at: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      run_id: run.id,
      geocoded: scrapeResult.geocoded,
      used_fallback: scrapeResult.used_fallback,
      source: scrapeResult.source,
      total_found: scrapeResult.results.length,
      total_saved: 0,
      results: scrapeResult.results.slice(0, 500),
      review_required: true,
    })
  } catch (e) {
    return handleError(e)
  }
}

/**
 * GET /api/locinsight/scrape — list previous scraper runs
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const limit = Math.min(100, Number(sp.get('limit') || 50))
    const runs = await db.scraperRun.findMany({
      orderBy: { started_at: 'desc' },
      take: limit,
    })
    return NextResponse.json({ success: true, data: runs })
  } catch (e) {
    return handleError(e)
  }
}
