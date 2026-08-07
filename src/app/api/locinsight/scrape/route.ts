/**
 * Data Scraper — uses free OpenStreetMap APIs:
 *   - Nominatim: geocoding (place name → lat/lng)
 *   - Overpass API: query POIs within a region
 *
 * Best practices (Aug 2026):
 *   - Nominatim usage policy: max 1 req/sec, valid User-Agent
 *   - Overpass: prefer public instance, retry with backoff
 *   - All results validated against Bali land polygon before saving
 *
 * Sources:
 *   - https://nominatim.org/release-docs/latest/api/Search/ (Aug 2026)
 *   - https://wiki.openstreetmap.org/wiki/Overpass_API (Aug 2026)
 *   - https://taginfo.openstreetmap.org/ for shop/amenity tags
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, handleError } from '@/lib/api-helpers'
import { isOnBaliLand } from '@/lib/data/bali-land'

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
 * Returns the top match.
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
 * Returns up to 40 results within Bali bbox.
 */
async function nominatimSearchByName(query: string, kind: 'store' | 'mall' | 'poi'): Promise<NominatimResult[]> {
  // Build a query that targets the kind
  const kindQueries: Record<string, string> = {
    store: `${query} cafe OR restaurant OR shop`,
    mall: `${query} mall OR shopping center`,
    poi: `${query} hotel OR attraction OR beach OR temple`,
  }
  const q = kindQueries[kind] || query
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=40&countrycodes=id&viewbox=114.4,-8.05,115.7,-8.85&bounded=1&addressdetails=1`
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'id,en' },
  })
  if (!res.ok) return []
  return (await res.json()) as NominatimResult[]
}

/**
 * Build an Overpass QL query for shops/amenities within a bbox.
 * Tags cover MAP/MAA-relevant POIs:
 *   - amenity=cafe, restaurant, fast_food
 *   - shop=clothes, shoes, sports, jewelry, beauty, bakery, confectionery
 *   - tourism=hotel, attraction
 *   - leisure=park, sports_centre
 */
function buildOverpassQuery(bbox: [number, number, number, number], kind: 'store' | 'mall' | 'poi'): string {
  // bbox = [south, west, north, east]
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
    // POI
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
  // Try public Overpass instances, fall back to backup
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
  // Return empty array instead of throwing — caller will handle gracefully
  return []
}

/**
 * Extract a friendly name from Overpass tags.
 */
function elementName(tags: Record<string, string>, fallback: string): string {
  return tags.name || tags.brand || tags['name:en'] || tags.operator || fallback
}

/**
 * Classify a POI type from Overpass tags.
 */
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

/**
 * Classify a store from Overpass tags.
 */
function classifyStore(tags: Record<string, string>): { brand_category: string; brand_name: string } | null {
  const name = (tags.name || tags.brand || '').toLowerCase()

  // Known MAP brands
  if (name.includes('starbucks')) return { brand_category: 'food_beverage', brand_name: 'Starbucks' }
  if (name.includes('pizza marzano') || name.includes('pizza hut')) return { brand_category: 'food_beverage', brand_name: 'Pizza Marzano' }
  if (name.includes('krispy kreme')) return { brand_category: 'food_beverage', brand_name: 'Krispy Kreme' }
  if (name.includes('godiva')) return { brand_category: 'food_beverage', brand_name: 'Godiva' }
  if (name.includes('sushi tei')) return { brand_category: 'food_beverage', brand_name: 'Sushi Tei' }
  if (name.includes('genki sushi')) return { brand_category: 'food_beverage', brand_name: 'Genki Sushi' }
  if (name.includes('subway')) return { brand_category: 'food_beverage', brand_name: 'Subway' }
  if (name.includes('popeyes')) return { brand_category: 'food_beverage', brand_name: "Popeyes" }
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

  // Generic store types
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, kind = 'all', save = true, radius_km = 5 } = body as {
      query: string
      kind?: 'store' | 'mall' | 'poi' | 'all'
      save?: boolean
      radius_km?: number
    }

    if (!query) {
      return NextResponse.json({ success: false, error: 'query is required' }, { status: 400 })
    }

    // Step 1: Geocode the query
    const geo = await geocode(query)
    if (!geo) {
      // Log failed scraper run
      const run = await db.scraperRun.create({
        data: { query, source: 'nominatim+overpass', status: 'failed', error: 'Geocode returned no results' },
      })
      return NextResponse.json({ success: false, error: 'Place not found', run_id: run.id }, { status: 404 })
    }

    const lat = parseFloat(geo.lat)
    const lng = parseFloat(geo.lon)
    const isBali = isOnBaliLand(lat, lng, 2) // 2km tolerance for coastal areas

    // Step 2: Build bbox around the geocoded point (±radius_km)
    const dLat = radius_km / 111
    const dLng = radius_km / (111 * Math.cos((lat * Math.PI) / 180))
    const bbox: [number, number, number, number] = [lat - dLat, lng - dLng, lat + dLat, lng + dLng]

    // Step 3: Run Overpass queries based on kind
    const kinds: Array<'store' | 'mall' | 'poi'> = kind === 'all' ? ['store', 'mall', 'poi'] : [kind]
    const allElements: Array<{ element: OverpassElement; kind: 'store' | 'mall' | 'poi' }> = []

    for (const k of kinds) {
      const q = buildOverpassQuery(bbox, k)
      const elements = await runOverpass(q)
      for (const element of elements) {
        allElements.push({ element, kind: k })
      }
    }

    // Step 3b: Fallback — if Overpass returned nothing, use Nominatim name search
    let usedFallback = false
    if (allElements.length === 0) {
      usedFallback = true
      for (const k of kinds) {
        const nomResults = await nominatimSearchByName(query, k)
        for (const r of nomResults) {
          // Convert Nominatim result to OverpassElement shape
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

    // Step 4: Process and validate
    const results: Array<{
      name: string
      type: string
      lat: number
      lng: number
      category: string
      kind: 'store' | 'mall' | 'poi'
      tags: Record<string, string>
      on_land: boolean
      saved: boolean
    }> = []

    let savedCount = 0

    for (const { element, kind: elKind } of allElements) {
      const elat = element.lat ?? element.center?.lat
      const elng = element.lon ?? element.center?.lon
      if (elat == null || elng == null) continue

      const tags = element.tags || {}
      const name = elementName(tags, `${elKind}_${element.id}`)
      const onLand = isOnBaliLand(elat, elng, 1) // 1km tolerance for coastal POIs

      let category = 'unknown'
      let saved = false

      if (elKind === 'store') {
        const cls = classifyStore(tags)
        if (cls) {
          category = `${cls.brand_name} (${cls.brand_category})`

          if (save && onLand) {
            // Check for duplicate (within 50m)
            const existing = await db.store.findMany({
              where: {
                lat: { gte: elat - 0.0005, lte: elat + 0.0005 },
                lng: { gte: elng - 0.0005, lte: elng + 0.0005 },
              },
              take: 1,
            })
            if (existing.length === 0) {
              const id = `SCR_S_${Date.now()}_${savedCount}`
              await db.store.create({
                data: {
                  id,
                  brand_id: 'BR_SCRAPER', // placeholder for scraped brands
                  brand_name: cls.brand_name,
                  brand_category: cls.brand_category,
                  parent: tags.brand ? 'MAP' : 'MAP', // unknown — default to MAP
                  name,
                  lat: elat,
                  lng: elng,
                  kec: geo.address?.town || geo.address?.county || '—',
                  kab: geo.address?.county || geo.address?.state || '—',
                  is_in_mall: false,
                  address: tags['addr:street'] ? `${tags['addr:street']}, ${tags['addr:city'] || ''}`.trim() : geo.display_name,
                  opened_year: new Date().getFullYear(),
                  confirmed: false,
                },
              })
              saved = true
              savedCount++
            }
          }
        }
      } else if (elKind === 'mall') {
        category = `Mall: ${name}`
        if (save && onLand) {
          const existing = await db.mall.findMany({
            where: {
              lat: { gte: elat - 0.001, lte: elat + 0.001 },
              lng: { gte: elng - 0.001, lte: elng + 0.001 },
            },
            take: 1,
          })
          if (existing.length === 0) {
            const id = `SCR_M_${Date.now()}_${savedCount}`
            await db.mall.create({
              data: {
                id,
                name,
                lat: elat,
                lng: elng,
                kec: geo.address?.town || geo.address?.county || '—',
                kab: geo.address?.county || geo.address?.state || '—',
                gla_m2: 0,
                opened_year: new Date().getFullYear(),
                class: 'community',
                anchor_count: 0,
                has_cinema: false,
                has_supermarket: false,
                has_department_store: false,
                visitor_estimate_daily: 5000,
                notes: `Scraped from OSM. Source: ${geo.display_name}`,
              },
            })
            saved = true
            savedCount++
          }
        }
      } else {
        // POI
        const cls = classifyPoi(tags)
        category = `${cls.type}: ${name}`
        if (save && onLand) {
          const existing = await db.poi.findMany({
            where: {
              lat: { gte: elat - 0.001, lte: elat + 0.001 },
              lng: { gte: elng - 0.001, lte: elng + 0.001 },
            },
            take: 1,
          })
          if (existing.length === 0) {
            const id = `SCR_P_${Date.now()}_${savedCount}`
            await db.poi.create({
              data: {
                id,
                name,
                type: cls.type,
                lat: elat,
                lng: elng,
                kec: geo.address?.town || geo.address?.county || '—',
                kab: geo.address?.county || geo.address?.state || '—',
                magnitude: cls.magnitude,
                notes: cls.notes,
              },
            })
            saved = true
            savedCount++
          }
        }
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
        saved,
      })
    }

    // Step 5: Save scraper run record
    const run = await db.scraperRun.create({
      data: {
        query,
        source: 'nominatim+overpass',
        status: 'success',
        found_count: results.length,
        saved_count: savedCount,
        result_json: JSON.stringify(results.slice(0, 200)),
        finishedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      run_id: run.id,
      geocoded: { lat, lng, display_name: geo.display_name, is_in_bali: isBali },
      used_fallback: usedFallback,
      source: usedFallback ? 'nominatim_only' : 'nominatim+overpass',
      total_found: results.length,
      total_saved: savedCount,
      results: results.slice(0, 200),
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
      orderBy: { startedAt: 'desc' },
      take: limit,
    })
    return NextResponse.json({ success: true, data: runs })
  } catch (e) {
    return handleError(e)
  }
}
