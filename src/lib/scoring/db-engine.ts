/**
 * DB-backed scoring helpers — loads competitor data from DB and feeds it into
 * the pure scoring engine. Used by opportunities, analyze, and overview APIs.
 */
import { prisma } from '@/lib/db'
import type { CompetitorStoreLite, ScoringConfig } from './engine'

let competitorCache: CompetitorStoreLite[] | null = null
let competitorCacheTime = 0
const COMPETITOR_CACHE_TTL_MS = 60_000 // 1 min

let storesCache: any[] | null = null
let storesCacheTime = 0
const STORES_CACHE_TTL_MS = 60_000 // 1 min

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

export async function buildScoringConfig(
  base: ScoringConfig = {},
  opts: { useTravelTime?: boolean } = {},
): Promise<ScoringConfig> {
  const competitors = await loadCompetitorStores()
  return {
    ...base,
    competitorStores: competitors,
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
