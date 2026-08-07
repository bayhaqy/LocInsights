/**
 * LocInsight Scoring Engine
 *
 * Implements best-practice retail location intelligence based on:
 *   - Placer.ai (2024): "6 factors of retail site selection"
 *   - GrowthFactor.ai (Aug 2025): "Site Selection Analytics"
 *   - Felt.com (Jun 2026): "Retail location analytics for site selection"
 *   - Targomo (Sep 2025): "Retail Site Selection with Gravitational Models"
 *   - MIT/Huff Model (Suhara et al. 2021, validated with transactional data)
 *   - MDPI ISPRS Int. J. Geo-Inf. (Tudor 2025): "Geomarketing Research in Retail"
 *
 * === Composite Score (0-100) ===
 *
 *   1. Market Potential      30% — population, density, income, tourist flow
 *   2. Accessibility         15% — road/transit, road proximity
 *   3. Foot Traffic          20% — mall proximity, POI density, tourist POI
 *   4. Competition           15% — same-brand cannibalization, competitor density
 *   5. Socioeconomic         10% — income segment match, HDI
 *   6. Network Synergy       10% — nearby MAP stores, mall presence
 *
 * === Huff Gravity Model ===
 *
 *   P(customer at zone i visits store j) =
 *       (Attractiveness_j / Distance_ij^lambda)
 *       / Σ_k (Attractiveness_k / Distance_ik^lambda)
 *
 *   - Attractiveness = store_size_m2 * brand_strength * format_factor * freshness_factor
 *   - Distance: Haversine km (production should use travel-time isochrones)
 *   - lambda = 1.5 for F&B, 2.0 for sports/fashion ( shoppers travel further for F&B)
 *
 * Output: per kelurahan, per brand opportunity — potential_market_share,
 *         estimated_daily_customers, projected_monthly_revenue, composite_score.
 */

import { BALI_KELURAHAN, type Kelurahan, haversineKm } from '../data/bali-kelurahan'
import { BALI_STORES } from '../data/bali-stores'
import { BALI_MALLS } from '../data/bali-malls'
import { BALI_POIS } from '../data/bali-poi'
import { BRANDS, type Brand } from '../data/brands'

export interface WeightedFactor {
  name: string
  weight: number
  raw_value: number // 0-100
  weighted: number // raw_value * weight
}

export interface OpportunityScore {
  kelurahan_id: string
  kelurahan_name: string
  kec_name: string
  kab_name: string
  tier: 1 | 2 | 3
  lat: number
  lng: number
  composite_score: number // 0-100
  recommendation: 'high_priority' | 'priority' | 'monitor' | 'avoid'
  factors: WeightedFactor[]
  // Huff model outputs
  potential_market_share: number // 0-1
  estimated_daily_customers: number
  projected_monthly_revenue_juta: number
  // Insights
  nearest_mall_distance_km: number
  nearest_mall_name: string | null
  nearby_existing_stores: number // MAP stores within 2km
  cannibalization_risk: 'low' | 'medium' | 'high'
  white_space_summary: string
}

export interface ScoringConfig {
  brand_id?: string // target brand; if absent, use generic F&B+Sports blend
  trade_area_radius_km: number // default 3
  weights?: Partial<{
    market_potential: number
    accessibility: number
    foot_traffic: number
    competition: number
    socioeconomic: number
    network_synergy: number
  }>
}

export const DEFAULT_WEIGHTS = {
  market_potential: 0.30,
  accessibility: 0.15,
  foot_traffic: 0.20,
  competition: 0.15,
  socioeconomic: 0.10,
  network_synergy: 0.10,
}

// Brand category → distance decay (lambda) for Huff model
function huffLambda(brand: Brand | undefined): number {
  if (!brand) return 1.8
  switch (brand.category) {
    case 'food_beverage': return 1.5 // F&B: short travel
    case 'sports': return 2.0 // specialty: shoppers travel further
    case 'fashion': return 1.9
    case 'department_store': return 2.2 // anchor: long travel
    case 'kids': return 1.7
    case 'beauty': return 1.6
    default: return 1.8
  }
}

// Format factor (some formats are inherently more attractive)
function formatFactor(brand: Brand | undefined): number {
  if (!brand) return 1.0
  if (brand.name === 'Starbucks') return 1.25 // strongest F&B pull
  if (brand.name === 'Sogo' || brand.name === 'SEIBU') return 1.20 // anchor pull
  if (brand.parent === 'MAA' && brand.format.includes('Multi-brand')) return 1.15
  return 1.0
}

// Average ticket size per category (in Rp ribu — thousands of rupiah)
function avgTicketSize(brand: Brand | undefined): number {
  if (!brand) return 60
  switch (brand.category) {
    case 'food_beverage':
      if (brand.format.includes('Coffee')) return 45
      if (brand.format.includes('Casual')) return 150
      if (brand.format.includes('Quick')) return 55
      return 80
    case 'sports': return 750
    case 'fashion': return 350
    case 'department_store': return 450
    case 'kids': return 280
    case 'beauty': return 220
    default: return 100
  }
}

// Daily conversion rate: % of trade-area population who become customers
function dailyConversionRate(brand: Brand | undefined): number {
  if (!brand) return 0.012
  switch (brand.category) {
    case 'food_beverage':
      if (brand.format.includes('Coffee')) return 0.025 // high frequency
      if (brand.format.includes('Quick')) return 0.018
      return 0.010
    case 'sports': return 0.004
    case 'fashion': return 0.006
    case 'department_store': return 0.008
    case 'kids': return 0.005
    default: return 0.010
  }
}

/**
 * Compute the composite opportunity score for one kelurahan, optionally for a target brand.
 */
export function scoreKelurahan(kel: Kelurahan, config: ScoringConfig = {}): OpportunityScore {
  const brand = config.brand_id ? BRANDS.find(b => b.id === config.brand_id) : undefined
  const tradeAreaKm = config.trade_area_radius_km ?? 3
  const w = { ...DEFAULT_WEIGHTS, ...(config.weights || {}) }

  // === 1. MARKET POTENTIAL (30%) ===
  // Population within trade area (estimate using density × area)
  const tradeAreaPop = Math.round(kel.population * 1.4) // include immediate neighbors' catchment
  const populationScore = Math.min(100, (tradeAreaPop / 25000) * 100)
  const densityScore = Math.min(100, (kel.density / 3000) * 100)
  const marketPotentialRaw =
    0.40 * populationScore +
    0.30 * densityScore +
    0.30 * kel.income_index

  // === 2. ACCESSIBILITY (15%) ===
  // Use precomputed transport_index + small bonus for trade-area connectivity
  const accessibilityRaw = Math.min(100, kel.transport_index * 0.85 + (kel.urban_index > 70 ? 15 : 5))

  // === 3. FOOT TRAFFIC (20%) ===
  // mall_proximity + POI density + tourist POI proximity
  // Find nearest mall
  let nearestMallDistance = Infinity
  let nearestMallName: string | null = null
  for (const m of BALI_MALLS) {
    if (m.visitor_estimate_daily === 0) continue // skip under-construction
    const d = haversineKm(kel.lat, kel.lng, m.lat, m.lng)
    if (d < nearestMallDistance) {
      nearestMallDistance = d
      nearestMallName = m.name
    }
  }
  const mallProximityScore = Math.max(0, 100 - nearestMallDistance * 20) // 0 at 5km+
  const footTrafficRaw =
    0.40 * mallProximityScore +
    0.30 * kel.poi_density_index +
    0.30 * kel.tourist_index

  // === 4. COMPETITION (15%) ===
  // Count existing MAP stores within 2km
  // For target brand: same-brand cannibalization (high penalty)
  // For generic: total existing store density (slight penalty for saturation)
  let sameBrandWithin2km = 0
  let otherBrandWithin2km = 0
  for (const s of BALI_STORES) {
    const d = haversineKm(kel.lat, kel.lng, s.lat, s.lng)
    if (d <= 2) {
      if (brand && s.brand_id === brand.id) sameBrandWithin2km += 1
      else otherBrandWithin2km += 1
    }
  }
  // Competition raw: high if FEW nearby same-brand stores AND few direct competitor brand stores
  const sameBrandPenalty = sameBrandWithin2km >= 2 ? 100
                          : sameBrandWithin2km === 1 ? 60
                          : 0
  const saturationPenalty = Math.min(60, otherBrandWithin2km * 10)
  const competitionRaw = Math.max(0, 100 - sameBrandPenalty - saturationPenalty * 0.5)

  // Cannibalization risk
  const cannibalizationRisk: 'low' | 'medium' | 'high' =
    sameBrandWithin2km >= 2 ? 'high' :
    sameBrandWithin2km === 1 ? 'medium' : 'low'

  // === 5. SOCIOECONOMIC (10%) ===
  // Match brand price segment to local income index
  let incomeMatchBonus = 0
  if (brand) {
    if (brand.price_segment === 'luxury' && kel.income_index > 60) incomeMatchBonus = 20
    else if (brand.price_segment === 'premium' && kel.income_index > 50) incomeMatchBonus = 15
    else if (brand.price_segment === 'mid' && kel.income_index > 35) incomeMatchBonus = 10
    else if (brand.price_segment === 'mass') incomeMatchBonus = 5
    else incomeMatchBonus = -10
  } else {
    incomeMatchBonus = kel.income_index > 50 ? 15 : 0
  }
  const socioeconomicRaw = Math.min(100, kel.income_index * 0.7 + incomeMatchBonus + (kel.tourist_index > 50 ? 15 : 0))

  // === 6. NETWORK SYNERGY (10%) ===
  // Other MAP stores within 5km (cluster effect)
  const nearbyMAPStores = BALI_STORES.filter(s => haversineKm(kel.lat, kel.lng, s.lat, s.lng) <= 5).length
  const synergyRaw = Math.min(100, nearbyMAPStores * 12 + (nearestMallDistance < 1 ? 25 : 0))

  // === Composite ===
  const factors: WeightedFactor[] = [
    { name: 'Market Potential', weight: w.market_potential, raw_value: marketPotentialRaw, weighted: marketPotentialRaw * w.market_potential },
    { name: 'Accessibility', weight: w.accessibility, raw_value: accessibilityRaw, weighted: accessibilityRaw * w.accessibility },
    { name: 'Foot Traffic', weight: w.foot_traffic, raw_value: footTrafficRaw, weighted: footTrafficRaw * w.foot_traffic },
    { name: 'Competition', weight: w.competition, raw_value: competitionRaw, weighted: competitionRaw * w.competition },
    { name: 'Socioeconomic', weight: w.socioeconomic, raw_value: socioeconomicRaw, weighted: socioeconomicRaw * w.socioeconomic },
    { name: 'Network Synergy', weight: w.network_synergy, raw_value: synergyRaw, weighted: synergyRaw * w.network_synergy },
  ]
  const composite = Math.round(factors.reduce((s, f) => s + f.weighted, 0))

  // === HUFF MODEL: project market share & revenue ===
  const lambda = huffLambda(brand)
  const fFactor = formatFactor(brand)
  const brandStrength = brand?.brand_strength ?? 0.7
  // Hypothetical new store: size = brand.typical_size_m2, attractiveness scaled
  const newStoreAttractiveness = (brand?.typical_size_m2 ?? 150) * brandStrength * fFactor

  // Existing competing stores in trade area
  const competingStores = BALI_STORES.filter(s => {
    if (brand && s.brand_id === brand.id) return false // skip own brand (we're considering new)
    return haversineKm(kel.lat, kel.lng, s.lat, s.lng) <= tradeAreaKm * 2
  })

  // Distance from kelurahan centroid to new store (assume 0 — we're scoring THIS location)
  const distToNew = 0.3 // km (small offset)
  const numerator = newStoreAttractiveness / Math.pow(Math.max(distToNew, 0.3), lambda)
  const denominator = numerator + competingStores.reduce((sum, s) => {
    const d = Math.max(haversineKm(kel.lat, kel.lng, s.lat, s.lng), 0.3)
    const attract = s.estimated_size_m2 * (BRANDS.find(b => b.id === s.brand_id)?.brand_strength ?? 0.7)
    return sum + attract / Math.pow(d, lambda)
  }, 0)
  const marketShare = numerator / denominator

  // Project daily customers and revenue
  const tradeAreaTotal = tradeAreaPop
  const conversionRate = dailyConversionRate(brand)
  // Tourist boost: coastal + high tourist_index
  const touristMultiplier = 1 + (kel.tourist_index / 100) * 1.5
  const estimatedDailyCustomers = Math.round(
    tradeAreaTotal * conversionRate * marketShare * touristMultiplier
  )
  const ticket = avgTicketSize(brand) // in Rp ribu
  const projectedMonthlyRevenueJuta = Math.round(
    (estimatedDailyCustomers * ticket * 30) / 1000 // convert Rp ribu × customers × 30 days to juta
  )

  // === Recommendation tier ===
  let recommendation: OpportunityScore['recommendation']
  if (composite >= 70 && cannibalizationRisk !== 'high') recommendation = 'high_priority'
  else if (composite >= 55 && cannibalizationRisk !== 'high') recommendation = 'priority'
  else if (composite >= 40) recommendation = 'monitor'
  else recommendation = 'avoid'

  // === White space summary ===
  const tierLabel = kel.tier === 1 ? 'Tier-1' : kel.tier === 2 ? 'Tier-2' : 'Tier-3'
  const hasNearbyMall = nearestMallDistance < 1.5
  const whiteSpaceSummary = buildWhiteSpaceSummary({
    kel, brand, tierLabel, hasNearbyMall,
    sameBrandWithin2km, otherBrandWithin2km,
    marketShare, composite, nearestMallName, nearestMallDistance
  })

  return {
    kelurahan_id: kel.id,
    kelurahan_name: kel.name,
    kec_name: kel.kec_name,
    kab_name: kel.kab_name,
    tier: kel.tier,
    lat: kel.lat,
    lng: kel.lng,
    composite_score: composite,
    recommendation,
    factors: factors.map(f => ({ ...f, weighted: Math.round(f.weighted * 10) / 10, raw_value: Math.round(f.raw_value) })),
    potential_market_share: Math.round(marketShare * 1000) / 1000,
    estimated_daily_customers: estimatedDailyCustomers,
    projected_monthly_revenue_juta: projectedMonthlyRevenueJuta,
    nearest_mall_distance_km: Math.round(nearestMallDistance * 10) / 10,
    nearest_mall_name: nearestMallName,
    nearby_existing_stores: sameBrandWithin2km + otherBrandWithin2km,
    cannibalization_risk: cannibalizationRisk,
    white_space_summary: whiteSpaceSummary,
  }
}

function buildWhiteSpaceSummary(params: {
  kel: Kelurahan
  brand: Brand | undefined
  tierLabel: string
  hasNearbyMall: boolean
  sameBrandWithin2km: number
  otherBrandWithin2km: number
  marketShare: number
  composite: number
  nearestMallName: string | null
  nearestMallDistance: number
}): string {
  const { kel, brand, tierLabel, hasNearbyMall, sameBrandWithin2km, otherBrandWithin2km, marketShare, composite, nearestMallName, nearestMallDistance } = params
  const parts: string[] = []

  parts.push(`${tierLabel} ${kel.kab_name} — ${kel.kec_name} (${kel.name})`)

  if (brand) {
    if (sameBrandWithin2km === 0) {
      parts.push(`Zero ${brand.name} stores within 2km — first-mover opportunity.`)
    } else {
      parts.push(`${sameBrandWithin2km} existing ${brand.name} within 2km — cannibalization risk.`)
    }
  } else {
    parts.push(`${otherBrandWithin2km} existing MAP stores within 2km.`)
  }

  if (hasNearbyMall && nearestMallName) {
    parts.push(`Near ${nearestMallName} (${nearestMallDistance.toFixed(1)}km) — strong foot-traffic source.`)
  } else if (nearestMallName) {
    parts.push(`Nearest mall: ${nearestMallName} at ${nearestMallDistance.toFixed(1)}km.`)
  } else {
    parts.push(`No major mall within practical distance — street-location strategy preferred.`)
  }

  if (kel.tourist_index > 60) parts.push('High tourist area — F&B and lifestyle brands fit well.')
  if (kel.income_index > 60) parts.push('Above-average purchasing power — premium brands viable.')
  if (kel.tier === 3 && kel.urban_index > 50) parts.push('Tier-3 with urban characteristics — early-mover advantage.')

  if (composite >= 70) parts.push('Composite score indicates strong expansion candidate.')
  else if (composite >= 55) parts.push('Composite score is favorable — proceed with detailed feasibility.')

  return parts.join(' ')
}

/**
 * Score all kelurahan, optionally for a specific brand. Sorted by composite_score desc.
 */
export function scoreAllKelurahan(config: ScoringConfig = {}): OpportunityScore[] {
  return BALI_KELURAHAN
    .map(k => scoreKelurahan(k, config))
    .sort((a, b) => b.composite_score - a.composite_score)
}

/**
 * Get top N expansion opportunities filtered by tier.
 */
export function getTopOpportunities(
  n: number,
  config: ScoringConfig = {},
  tierFilter?: 1 | 2 | 3
): OpportunityScore[] {
  let scores = scoreAllKelurahan(config)
  if (tierFilter) {
    scores = scores.filter(s => s.tier === tierFilter)
  }
  return scores.slice(0, n)
}

/**
 * Aggregate stats for dashboard
 */
export interface DashboardStats {
  total_kelurahan: number
  total_stores: number
  total_malls: number
  tier_1_stores: number
  tier_2_stores: number
  tier_3_stores: number
  high_priority_count: number
  priority_count: number
  monitor_count: number
  avoid_count: number
  avg_composite_score: number
  top_5_kelurahan: OpportunityScore[]
  stores_by_kabupaten: { kab: string; count: number }[]
  brands_coverage: { brand: string; stores: number; category: string }[]
  malls_without_map_anchor: { name: string; kec: string; kab: string }[]
}

export function getDashboardStats(): DashboardStats {
  const allScores = scoreAllKelurahan()

  // Tier classification by kabupaten (matches KABUPATEN_LIST.tier)
  const KAB_TIER: Record<string, 1 | 2 | 3> = {
    'Badung': 1, 'Denpasar': 1,
    'Tabanan': 2, 'Gianyar': 2, 'Buleleng': 2,
    'Jembrana': 3, 'Klungkung': 3, 'Bangli': 3, 'Karangasem': 3,
  }
  const tier1Stores = BALI_STORES.filter(s => KAB_TIER[s.kab] === 1).length
  const tier2Stores = BALI_STORES.filter(s => KAB_TIER[s.kab] === 2).length
  const tier3Stores = BALI_STORES.filter(s => KAB_TIER[s.kab] === 3).length

  // Malls without MAP anchor (Sogo / Matahari / Sports Station)
  const anchorBrandIds = ['BR101', 'BR102', 'BR201', 'BR202', 'BR203'] // Sports Station, Planet Sports, Sogo, SEIBU, Matahari
  const mallsWithoutAnchor = BALI_MALLS.filter(m => {
    if (m.visitor_estimate_daily === 0) return false // skip under construction
    const storesInMall = BALI_STORES.filter(s => s.mall_id === m.id)
    return !storesInMall.some(s => anchorBrandIds.includes(s.brand_id))
  })

  // Brand coverage stats
  const brandCoverage = BRANDS.map(b => ({
    brand: b.name,
    stores: BALI_STORES.filter(s => s.brand_id === b.id).length,
    category: b.category,
  })).filter(x => x.stores > 0).sort((a, b) => b.stores - a.stores)

  // Stores by kabupaten
  const kabMap = new Map<string, number>()
  for (const s of BALI_STORES) {
    kabMap.set(s.kab, (kabMap.get(s.kab) || 0) + 1)
  }

  return {
    total_kelurahan: BALI_KELURAHAN.length,
    total_stores: BALI_STORES.length,
    total_malls: BALI_MALLS.length,
    tier_1_stores: tier1Stores,
    tier_2_stores: tier2Stores,
    tier_3_stores: tier3Stores,
    high_priority_count: allScores.filter(s => s.recommendation === 'high_priority').length,
    priority_count: allScores.filter(s => s.recommendation === 'priority').length,
    monitor_count: allScores.filter(s => s.recommendation === 'monitor').length,
    avoid_count: allScores.filter(s => s.recommendation === 'avoid').length,
    avg_composite_score: Math.round(allScores.reduce((s, x) => s + x.composite_score, 0) / allScores.length),
    top_5_kelurahan: allScores.slice(0, 5),
    stores_by_kabupaten: Array.from(kabMap.entries()).map(([kab, count]) => ({ kab, count })),
    brands_coverage: brandCoverage,
    malls_without_map_anchor: mallsWithoutAnchor.map(m => ({ name: m.name, kec: m.kec, kab: m.kab })),
  }
}
