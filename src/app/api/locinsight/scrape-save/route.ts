/**
 * Save selected scraper results — UNIFIED endpoint.
 *
 * POST /api/locinsight/scrape-save
 *   body: {
 *     run_id?: string,
 *     query?: string,
 *     items: ScraperResultRow[]  // selected rows from the UI
 *   }
 *
 * ROUTING LOGIC (key fix vs. old version):
 *   For each item with kind='store':
 *     1. classifyScrapedBrand(item.brand_name) →
 *        - target='maa_store'  → save to `stores` table with brand_id + parent from Brand catalog
 *        - target='competitor' → save to `competitor_stores` table
 *        - target='other'      → save to `competitor_stores` table with brand_name = actual
 *     2. Malls → always go to `malls` table (no brand classification)
 *     3. POIs  → always go to `pois` table
 *
 * This prevents the "store pollution" issue where scraped non-MAA brands
 * (Starbucks, Zara, Indomaret, etc.) were being written into the master
 * `stores` table with `brand_id='BR_SCRAPER'` and `parent='MAP'`.
 *
 * Returns: { success, saved: {stores, competitors, malls, pois, total}, skipped, errors }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isOnBaliLand } from '@/lib/data/bali-land'
import { haversineKm } from '@/lib/data/bali-kelurahan'
import { classifyScrapedBrand } from '@/lib/brand-classifier'
import type { ScraperResultRow } from '@/lib/scraper-types'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface SaveItem extends ScraperResultRow {}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { run_id, items } = body as {
      run_id?: string
      query?: string
      items: SaveItem[]
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

    // Load existing competitor stores once for dedup (50m rule)
    const existingCompetitors = await prisma.competitorStore.findMany({
      select: { id: true, lat: true, lng: true, brand_name: true },
    })

    // Load existing malls once for dedup
    const existingMalls = await prisma.mall.findMany({
      select: { id: true, lat: true, lng: true },
    })

    // Load existing POIs once for dedup
    const existingPois = await prisma.poi.findMany({
      select: { id: true, lat: true, lng: true },
    })

    // Load existing MAA/MAP stores once for dedup
    const existingStores = await prisma.store.findMany({
      select: { id: true, lat: true, lng: true, brand_id: true },
    })

    const savedStores: string[] = []
    const savedCompetitors: string[] = []
    const savedMalls: string[] = []
    const savedPois: string[] = []
    const errors: Array<{ index: number; name: string; error: string }> = []
    let skipped = 0
    const now = Date.now()

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        // Validate on land
        if (!isOnBaliLand(item.lat, item.lng, 1)) {
          errors.push({ index: i, name: item.name, error: 'Location is in the sea — skipped' })
          skipped++
          continue
        }

        // ----- STORE items: classify and route -----
        if (item.kind === 'store') {
          const cls = classifyScrapedBrand(item.brand_name || item.name)

          if (cls.target === 'maa_store' && cls.brand_id && cls.parent) {
            // Save to master `stores` table — only MAA/MAP brands belong here
            const nearby = existingStores.find(s =>
              s.brand_id === cls.brand_id &&
              haversineKm(s.lat, s.lng, item.lat, item.lng) < 0.05
            )
            if (nearby) {
              skipped++
              continue
            }
            const id = `SCR_S_${now}_${savedStores.length}`
            await prisma.store.create({
              data: {
                id,
                brand_id: cls.brand_id,
                brand_name: cls.brand_name,
                brand_category: (cls.brand_category as any) || 'lifestyle',
                parent: cls.parent,
                name: item.name,
                lat: item.lat,
                lng: item.lng,
                kec: item.tags?.['addr:suburb'] || '',
                kab: item.tags?.['addr:county'] || '',
                city: item.tags?.['addr:city'] || '',
                country: 'Indonesia',
                is_in_mall: item.tags?._is_in_mall === 'true',
                mall_name: item.tags?._mall_name || null,
                address: item.address || '',
                opened_year: new Date().getFullYear(),
                confirmed: false,
                source: item.source,
              },
            })
            savedStores.push(id)
          } else {
            // Save to competitor_stores (competitor or other)
            const targetBrand = cls.brand_name || item.brand_name || 'Unknown'
            const nearbyComp = existingCompetitors.find(c =>
              c.brand_name === targetBrand &&
              haversineKm(c.lat, c.lng, item.lat, item.lng) < 0.05
            )
            if (nearbyComp) {
              // Update existing row with richer info
              await prisma.competitorStore.update({
                where: { id: nearbyComp.id },
                data: {
                  name: item.name,
                  kec: item.tags?.['addr:suburb'] || undefined,
                  kab: item.tags?.['addr:county'] || undefined,
                  city: item.tags?.['addr:city'] || undefined,
                  address: item.address || undefined,
                  is_in_mall: item.tags?._is_in_mall === 'true',
                  mall_name: item.tags?._mall_name || null,
                  source: (item.source?.startsWith('OSM') ? 'osm' : 'osm') as any,
                },
              })
              savedCompetitors.push(nearbyComp.id)
            } else {
              const created = await prisma.competitorStore.create({
                data: {
                  brand_name: targetBrand,
                  brand_category: (cls.brand_category as any) || 'other',
                  name: item.name,
                  lat: item.lat,
                  lng: item.lng,
                  kec: item.tags?.['addr:suburb'] || '',
                  kab: item.tags?.['addr:county'] || '',
                  city: item.tags?.['addr:city'] || '',
                  country: 'Indonesia',
                  address: item.address || '',
                  is_in_mall: item.tags?._is_in_mall === 'true',
                  mall_name: item.tags?._mall_name || null,
                  source: 'osm' as any,
                },
              })
              existingCompetitors.push({
                id: created.id,
                lat: created.lat,
                lng: created.lng,
                brand_name: created.brand_name,
              })
              savedCompetitors.push(created.id)
            }
          }
          continue
        }

        // ----- MALL items -----
        if (item.kind === 'mall') {
          const nearby = existingMalls.find(m =>
            haversineKm(m.lat, m.lng, item.lat, item.lng) < 0.1
          )
          if (nearby) {
            skipped++
            continue
          }
          const id = `SCR_M_${now}_${savedMalls.length}`
          await prisma.mall.create({
            data: {
              id,
              name: item.name,
              lat: item.lat,
              lng: item.lng,
              kec: item.tags?.['addr:suburb'] || '',
              kab: item.tags?.['addr:county'] || '',
              city: item.tags?.['addr:city'] || '',
              country: 'Indonesia',
              gla_m2: 0,
              opened_year: new Date().getFullYear(),
              class: 'community',
              anchor_count: 0,
              has_cinema: false,
              has_supermarket: false,
              has_department_store: false,
              visitor_estimate_daily: 5000,
              notes: 'Scraped from OSM',
              source: item.source,
            },
          })
          savedMalls.push(id)
          continue
        }

        // ----- POI items -----
        if (item.kind === 'poi') {
          const nearby = existingPois.find(p =>
            haversineKm(p.lat, p.lng, item.lat, item.lng) < 0.1
          )
          if (nearby) {
            skipped++
            continue
          }
          const id = `SCR_P_${now}_${savedPois.length}`
          await prisma.poi.create({
            data: {
              id,
              name: item.name,
              type: (item.poi_type || 'tourist_attraction') as any,
              lat: item.lat,
              lng: item.lng,
              kec: item.tags?.['addr:suburb'] || '',
              kab: item.tags?.['addr:county'] || '',
              city: item.tags?.['addr:city'] || '',
              country: 'Indonesia',
              magnitude: item.poi_magnitude || 1000,
              notes: item.poi_notes || '',
              source: item.source,
            },
          })
          savedPois.push(id)
          continue
        }
      } catch (e: any) {
        errors.push({ index: i, name: item.name, error: e.message })
      }
    }

    // Update ScraperRun if run_id was provided
    if (run_id) {
      const totalSaved = savedStores.length + savedCompetitors.length + savedMalls.length + savedPois.length
      await prisma.scraperRun.update({
        where: { id: run_id },
        data: { saved_count: totalSaved },
      }).catch(() => {/* run might not exist if from old session */})
    }

    return NextResponse.json({
      success: true,
      saved: {
        stores: savedStores.length,         // MAA/MAP brands
        competitors: savedCompetitors.length, // competitors + other
        malls: savedMalls.length,
        pois: savedPois.length,
        total: savedStores.length + savedCompetitors.length + savedMalls.length + savedPois.length,
      },
      skipped,
      errors,
      error_count: errors.length,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
