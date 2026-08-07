/**
 * Save competitor scraper results — Phase 2.
 *
 * POST /api/locinsight/scrape-competitors-save
 *   body: { items: ScrapedCompetitor[] }
 *   returns: { created, updated, errors }
 *
 * Persists user-selected competitor store records. Dedupes within 50m.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { haversineKm } from '@/lib/data/bali-kelurahan'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface SaveItem {
  brand_name: string
  brand_category: string
  name: string
  lat: number
  lng: number
  kec?: string
  kab?: string
  city?: string
  address?: string
  is_in_mall?: boolean
  mall_name?: string | null
  source?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const items: SaveItem[] = Array.isArray(body.items) ? body.items : []

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: 'items[] is required' }, { status: 400 })
    }
    if (items.length > 5000) {
      return NextResponse.json({ success: false, error: 'Max 5000 items per save' }, { status: 400 })
    }

    // Load existing competitor stores for dedup
    const existing = await prisma.competitorStore.findMany({
      select: { id: true, lat: true, lng: true, brand_name: true },
    })

    let created = 0
    let updated = 0
    const errors: { row: number; error: string }[] = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        // Find nearby existing within 50m
        const nearby = existing.find(e =>
          e.brand_name === item.brand_name &&
          haversineKm(e.lat, e.lng, item.lat, item.lng) < 0.05
        )

        if (nearby) {
          // Update if address/kec is empty in DB but present here
          await prisma.competitorStore.update({
            where: { id: nearby.id },
            data: {
              name: item.name,
              kec: item.kec || undefined,
              kab: item.kab || undefined,
              city: item.city || undefined,
              address: item.address || undefined,
              is_in_mall: item.is_in_mall ?? false,
              mall_name: item.mall_name ?? null,
              source: item.source || 'osm_overpass',
            },
          })
          updated += 1
        } else {
          const created_row = await prisma.competitorStore.create({
            data: {
              brand_name: item.brand_name,
              brand_category: item.brand_category,
              name: item.name,
              lat: item.lat,
              lng: item.lng,
              kec: item.kec || '',
              kab: item.kab || '',
              city: item.city || '',
              address: item.address || '',
              is_in_mall: item.is_in_mall ?? false,
              mall_name: item.mall_name ?? null,
              source: item.source || 'osm_overpass',
            },
          })
          existing.push({
            id: created_row.id,
            lat: created_row.lat,
            lng: created_row.lng,
            brand_name: created_row.brand_name,
          })
          created += 1
        }
      } catch (e: any) {
        errors.push({ row: i, error: e.message })
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors,
      total: items.length,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
