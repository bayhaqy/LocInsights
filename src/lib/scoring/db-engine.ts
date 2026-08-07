/**
 * DB-backed scoring helpers — loads competitor data from DB and feeds it into
 * the pure scoring engine. Used by opportunities, analyze, and overview APIs.
 */
import { prisma } from '@/lib/db'
import type { CompetitorStoreLite, ScoringConfig } from './engine'

let competitorCache: CompetitorStoreLite[] | null = null
let competitorCacheTime = 0
const COMPETITOR_CACHE_TTL_MS = 60_000 // 1 min

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
