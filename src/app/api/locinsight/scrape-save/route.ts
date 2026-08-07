/**
 * Save selected scraper results to master data tables.
 *
 * POST /api/locinsight/scrape-save
 *   Body: {
 *     run_id?: string,           // optional — links back to ScraperRun for audit
 *     query?: string,            // optional — for audit if run_id not provided
 *     items: ScraperResultRow[]  // selected rows from the UI
 *   }
 *
 * Returns: { success, saved: { stores, malls, pois }, skipped: number, errors: [] }
 *
 * Strategy:
 *   - For each item, look up by lat/lng within 50m to dedupe
 *   - Insert if not exists; skip if exists
 *   - Update ScraperRun.saved_count at the end if run_id is provided
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, handleError } from '@/lib/api-helpers'
import { isOnBaliLand } from '@/lib/data/bali-land'
import type { ScraperResultRow, GeocodedResult } from '@/lib/scraper-types'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface SaveItem extends ScraperResultRow {}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { run_id, query, items, geocoded } = body as {
      run_id?: string
      query?: string
      items: SaveItem[]
      geocoded?: GeocodedResult
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'items array is required' }, { status: 400 })
    }
    if (items.length > 500) {
      return NextResponse.json(
        { success: false, error: `Too many items: ${items.length}. Max 500 per request.` },
        { status: 400 },
      )
    }

    // Helper to derive kec/kab/city from geocoded address (best effort)
    const deriveLocation = () => {
      const addr = geocoded?.address || {}
      const town = addr.town || addr.village || ''
      const city = addr.city || town
      const kab = addr.county || addr.state || ''
      const kec = town || kab
      return { kec, kab, city }
    }
    const loc = deriveLocation()

    const savedStores: string[] = []
    const savedMalls: string[] = []
    const savedPois: string[] = []
    const errors: Array<{ index: number; name: string; error: string }> = []
    let skipped = 0

    const now = Date.now()

    // Ensure the placeholder brand 'BR_SCRAPER' exists (foreign key target for scraped stores)
    // Use upsert to be idempotent across runs.
    await db.brand.upsert({
      where: { id: 'BR_SCRAPER' },
      create: {
        id: 'BR_SCRAPER',
        name: 'Scraped (Unassigned)',
        parent: 'MAP',
        category: 'lifestyle',
        origin_country: 'Unknown',
        format: 'unknown',
        location_preference: 'both',
        typical_size_m2: 0,
        target_audience: 'Unknown',
        price_segment: 'mid',
        brand_strength: 0.0,
        notes: 'Placeholder brand for stores added via the OSM scraper. Replace brand_id with the actual brand once classified.',
        city: '',
        country: 'Indonesia',
        source: 'system (scraper placeholder)',
      },
      update: {},
    }).catch(() => {/* ignore — already exists */})
    let i = 0
    for (const item of items) {
      try {
        // Validate on land (allow 1km tolerance for coastal POIs)
        if (!isOnBaliLand(item.lat, item.lng, 1)) {
          errors.push({ index: i, name: item.name, error: 'Location is in the sea — skipped' })
          skipped++
          i++
          continue
        }

        if (item.kind === 'store') {
          // Dedupe within 50m
          const existing = await db.store.findMany({
            where: {
              lat: { gte: item.lat - 0.0005, lte: item.lat + 0.0005 },
              lng: { gte: item.lng - 0.0005, lte: item.lng + 0.0005 },
            },
            take: 1,
          })
          if (existing.length > 0) {
            skipped++
            i++
            continue
          }
          const id = `SCR_S_${now}_${savedStores.length}`
          await db.store.create({
            data: {
              id,
              brand_id: 'BR_SCRAPER',
              brand_name: item.brand_name || 'Unknown Scraped',
              brand_category: item.brand_category || 'lifestyle',
              parent: 'MAP',
              name: item.name,
              lat: item.lat,
              lng: item.lng,
              kec: loc.kec || '—',
              kab: loc.kab || '—',
              city: loc.city,
              country: 'Indonesia',
              is_in_mall: false,
              address: item.address || '',
              opened_year: new Date().getFullYear(),
              confirmed: false,
              source: item.source,
            },
          })
          savedStores.push(id)
        } else if (item.kind === 'mall') {
          const existing = await db.mall.findMany({
            where: {
              lat: { gte: item.lat - 0.001, lte: item.lat + 0.001 },
              lng: { gte: item.lng - 0.001, lte: item.lng + 0.001 },
            },
            take: 1,
          })
          if (existing.length > 0) {
            skipped++
            i++
            continue
          }
          const id = `SCR_M_${now}_${savedMalls.length}`
          await db.mall.create({
            data: {
              id,
              name: item.name,
              lat: item.lat,
              lng: item.lng,
              kec: loc.kec || '—',
              kab: loc.kab || '—',
              city: loc.city,
              country: 'Indonesia',
              gla_m2: 0,
              opened_year: new Date().getFullYear(),
              class: 'community',
              anchor_count: 0,
              has_cinema: false,
              has_supermarket: false,
              has_department_store: false,
              visitor_estimate_daily: 5000,
              notes: `Scraped from OSM`,
              source: item.source,
            },
          })
          savedMalls.push(id)
        } else if (item.kind === 'poi') {
          const existing = await db.poi.findMany({
            where: {
              lat: { gte: item.lat - 0.001, lte: item.lat + 0.001 },
              lng: { gte: item.lng - 0.001, lte: item.lng + 0.001 },
            },
            take: 1,
          })
          if (existing.length > 0) {
            skipped++
            i++
            continue
          }
          const id = `SCR_P_${now}_${savedPois.length}`
          await db.poi.create({
            data: {
              id,
              name: item.name,
              type: item.poi_type || 'tourist_attraction',
              lat: item.lat,
              lng: item.lng,
              kec: loc.kec || '—',
              kab: loc.kab || '—',
              city: loc.city,
              country: 'Indonesia',
              magnitude: item.poi_magnitude || 1000,
              notes: item.poi_notes || '',
              source: item.source,
            },
          })
          savedPois.push(id)
        }
      } catch (e: any) {
        errors.push({ index: i, name: item.name, error: e.message })
      }
      i++
    }

    // Update ScraperRun if run_id was provided
    if (run_id) {
      const totalSaved = savedStores.length + savedMalls.length + savedPois.length
      await db.scraperRun.update({
        where: { id: run_id },
        data: {
          saved_count: totalSaved,
        },
      }).catch(() => {/* run might not exist if from old session */})
    }

    return NextResponse.json({
      success: true,
      saved: {
        stores: savedStores.length,
        malls: savedMalls.length,
        pois: savedPois.length,
        total: savedStores.length + savedMalls.length + savedPois.length,
      },
      skipped,
      errors,
      error_count: errors.length,
    })
  } catch (e) {
    return handleError(e)
  }
}
