/**
 * DB-backed scoring helpers — loads competitor + kelurahan data from DB and feeds
 * it into the pure scoring engine. Used by opportunities, analyze, and overview APIs.
 */
import { prisma } from '@/lib/db'
import { BALI_KELURAHAN, type Kelurahan } from '../data/bali-kelurahan'
import type { CompetitorStoreLite, ScoringConfig } from './engine'

let competitorCache: CompetitorStoreLite[] | null = null
let competitorCacheTime = 0
const COMPETITOR_CACHE_TTL_MS = 60_000 // 1 min

let storesCache: any[] | null = null
let storesCacheTime = 0
const STORES_CACHE_TTL_MS = 60_000 // 1 min

let kelurahanCache: Kelurahan[] | null = null
let kelurahanCacheTime = 0
const KELURAHAN_CACHE_TTL_MS = 5 * 60_000 // 5 min (rarely changes)

export async function loadCompetitorStores(): Promise<CompetitorStoreLite[]> {
  const now = Date.now()
  if (competitorCache && (now - competitorCacheTime) < COMPETITOR_CACHE_TTL_MS) {
    return competitorCache
  }
  const rows = await prisma.competitorStore.findMany({
    select: { brand_name: true, brand_category: true, lat: true, lng: true },
  })
  const result: CompetitorStoreLite[] = rows.map(r => ({
    brand_name: r.brand_name,
    brand_category: r.brand_category,
    lat: r.lat,
    lng: r.lng,
  }))
  competitorCache = result
  competitorCacheTime = now
  return result
}

/**
 * Load all MAA/MAP stores from the DB (Supabase).
 * Used by the overview API to populate the dashboard with real DB data
 * (including scraped OSM stores) instead of the static BALI_STORES array.
 *
 * Returns an array shaped like BALI_STORES so the frontend can consume it
 * without changes.
 */
export async function loadStoresFromDB(): Promise<any[]> {
  const now = Date.now()
  if (storesCache && (now - storesCacheTime) < STORES_CACHE_TTL_MS) {
    return storesCache
  }
  const rows = await prisma.store.findMany({
    select: {
      id: true,
      brand_id: true,
      brand_name: true,
      brand_category: true,
      parent: true,
      name: true,
      lat: true,
      lng: true,
      kec: true,
      kab: true,
      is_in_mall: true,
      mall_id: true,
      mall_name: true,
      address: true,
      opened_year: true,
      confirmed: true,
    },
  })
  // Cast Prisma Decimal/enum fields to plain JS types for the frontend
  const result = rows.map(r => ({
    ...r,
    lat: typeof r.lat === 'object' ? parseFloat(String(r.lat)) : r.lat,
    lng: typeof r.lng === 'object' ? parseFloat(String(r.lng)) : r.lng,
    brand_category: String(r.brand_category),
    parent: String(r.parent),
  }))
  storesCache = result
  storesCacheTime = now
  return result
}

/**
 * Load all 716 kelurahan/desa from the DB (Supabase) — real BPS/KEMENDAGRI villages
 * with backfilled demographic indices (income, urban, tourist, transport, poi_density).
 *
 * Returns an array shaped like BALI_KELURAHAN (static fallback) so the scoring engine
 * and frontend can consume it without changes.
 *
 * Falls back to static BALI_KELURAHAN if DB query fails.
 */
export async function loadKelurahanFromDB(): Promise<Kelurahan[]> {
  const now = Date.now()
  if (kelurahanCache && (now - kelurahanCacheTime) < KELURAHAN_CACHE_TTL_MS) {
    return kelurahanCache
  }
  try {
    const rows = await prisma.kelurahan.findMany({
      orderBy: { id: 'asc' },
      take: 5000,
    })
    const tierNum = (t: string | null | undefined): 1 | 2 | 3 => {
      if (!t) return 3
      if (t === 'tier_1') return 1
      if (t === 'tier_2') return 2
      return 3
    }
    const result: Kelurahan[] = rows.map(r => ({
      id: r.id,
      code: r.code || r.id,
      name: r.name,
      kec_code: r.kec_code,
      kec_name: r.kec_name || '',
      kab_code: r.kab_code,
      kab_name: r.kab_name || '',
      tier: tierNum(r.tier as string | null),
      lat: typeof r.lat === 'object' ? parseFloat(String(r.lat)) : r.lat,
      lng: typeof r.lng === 'object' ? parseFloat(String(r.lng)) : r.lng,
      population: r.population ?? 0,
      area_km2: r.area_km2 ?? 0,
      density: r.density ?? 0,
      urban_index: r.urban_index ?? 50,
      income_index: r.income_index ?? 50,
      tourist_index: r.tourist_index ?? 30,
      transport_index: r.transport_index ?? 50,
      poi_density_index: r.poi_density_index ?? 30,
      mall_proximity_index: 0, // computed dynamically in scoring
      existing_store_density: 0, // computed dynamically in scoring
      is_coastal: r.is_coastal ?? false,
    }))
    kelurahanCache = result
    kelurahanCacheTime = now
    return result
  } catch (e) {
    console.warn('[loadKelurahanFromDB] DB load failed, falling back to static BALI_KELURAHAN:', e)
    return BALI_KELURAHAN
  }
}

export async function buildScoringConfig(
  base: ScoringConfig = {},
  opts: { useTravelTime?: boolean } = {},
): Promise<ScoringConfig> {
  const [competitors, kelurahan] = await Promise.all([
    loadCompetitorStores(),
    loadKelurahanFromDB(),
  ])
  return {
    ...base,
    competitorStores: competitors,
    kelurahanList: kelurahan,
    useTravelTime: opts.useTravelTime ?? true,
  }
}

export function invalidateCompetitorCache() {
  competitorCache = null
  competitorCacheTime = 0
}

export function invalidateStoresCache() {
  storesCache = null
  storesCacheTime = 0
}

export function invalidateKelurahanCache() {
  kelurahanCache = null
  kelurahanCacheTime = 0
}
