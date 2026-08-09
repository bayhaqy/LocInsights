'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  MapPin, Building2, Compass, Filter, Crosshair, Search, RotateCcw,
  Shield, TrendingUp, Activity, Users, Sparkles, Banknote, Bus,
} from 'lucide-react'
import { Store as StoreIcon } from 'lucide-react'
import type { OpportunityScore, Store, Mall, POI } from './types'
import { Button } from '@/components/ui/button'
import type { DemoMetric, DemoGranularity, DemoRegionRow } from './choropleth-demographics-layer'
import { useLanguage } from '@/lib/i18n/language-provider'

interface MapExplorerProps {
  opportunities: OpportunityScore[]
  stores: Store[]
  malls: Mall[]
  pois: POI[]
  selectedKelurahanId: string | null
  onSelectKelurahan: (id: string) => void
  /** Called when the user clicks the "Selected" card — typically navigates to Opportunities. */
  onOpenOpportunities?: () => void
  /** Called when the user clicks "Deep Analysis →" inside the Selected card. */
  onOpenAnalysis?: () => void
}

// Dynamic import with ssr:false to avoid Leaflet's window reference during SSR
function MapLoadingState() {
  const { t } = useLanguage()
  return (
    <div className="w-full h-full flex items-center justify-center bg-[var(--brand-cream)] rounded-lg border border-[var(--brand-border)]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[var(--brand-red)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <div className="text-[12px] text-[var(--brand-ink)]/60">{t('map.loading_map')}</div>
      </div>
    </div>
  )
}
const LocInsightMap = dynamic(
  () => import('./locinsight-map').then(mod => ({ default: mod.LocInsightMap })),
  { ssr: false, loading: () => <MapLoadingState /> }
)

// ===== Unified layer type =====
type LayerId =
  | 'opportunity'
  | 'demographics'
  | 'stores'
  | 'malls'
  | 'competitors'
  | 'tourist_pois'
  | 'civic_pois'
  | 'crowd_density'

type VizMode = 'choropleth' | 'point'
type RegionLevel = 'kabupaten' | 'kecamatan' | 'kelurahan'

const BRAND_CATEGORY_OPTIONS = [
  { value: 'all', labelKey: 'map.cat.all' },
  { value: 'sports', labelKey: 'map.cat.sports' },
  { value: 'fashion', labelKey: 'map.cat.fashion' },
  { value: 'food_beverage', labelKey: 'map.cat.food_beverage' },
  { value: 'department_store', labelKey: 'map.cat.department_store' },
  { value: 'kids', labelKey: 'map.cat.kids' },
  { value: 'lifestyle', labelKey: 'map.cat.lifestyle' },
  { value: 'beauty', labelKey: 'map.cat.beauty' },
  { value: 'athleisure', labelKey: 'map.cat.athleisure' },
  { value: 'footwear', labelKey: 'map.cat.footwear' },
]

const PARENT_OPTIONS = [
  { value: 'all', labelKey: 'map.parent.all' },
  { value: 'MAP', labelKey: 'map.parent.map' },
  { value: 'MAA', labelKey: 'map.parent.maa' },
]

// Demographics metric options
const DEMO_METRIC_OPTIONS: { value: DemoMetric; labelKey: string; icon: any; color: string }[] = [
  { value: 'income_index', labelKey: 'map.demo.income_index', icon: Banknote, color: '#31a354' },
  { value: 'urban_index', labelKey: 'map.demo.urban_index', icon: Building2, color: '#fd8d3c' },
  { value: 'tourist_index', labelKey: 'map.demo.tourist_index', icon: Sparkles, color: '#41ae76' },
  { value: 'transport_index', labelKey: 'map.demo.transport_index', icon: Bus, color: '#8856a7' },
  { value: 'poi_density_index', labelKey: 'map.demo.poi_density_index', icon: MapPin, color: '#ec7014' },
  { value: 'population_density', labelKey: 'map.demo.population_density', icon: Users, color: '#ef3b2c' },
  { value: 'population', labelKey: 'map.demo.population', icon: Users, color: '#3182bd' },
]

// Layers that support choropleth + point visualization
const CHOROPLETH_CAPABLE_LAYERS: LayerId[] = ['opportunity', 'demographics']

export function MapExplorer({
  opportunities, stores, malls, pois, selectedKelurahanId, onSelectKelurahan, onOpenOpportunities, onOpenAnalysis,
}: MapExplorerProps) {
  const { t } = useLanguage()
  // ===== Layer visibility + visualization config =====
  const [layerOn, setLayerOn] = useState<Record<LayerId, boolean>>({
    opportunity: true,
    demographics: false,
    stores: true,
    malls: true,
    competitors: false,
    tourist_pois: false,
    civic_pois: false,
    crowd_density: false,
  })

  // Per-layer visualization mode (choropleth vs point)
  const [layerVizMode, setLayerVizMode] = useState<Record<LayerId, VizMode>>({
    opportunity: 'choropleth',
    demographics: 'choropleth',
    stores: 'point',
    malls: 'point',
    competitors: 'point',
    tourist_pois: 'point',
    civic_pois: 'point',
    crowd_density: 'point',
  })

  // Per-layer region level (only meaningful when vizMode = choropleth)
  const [layerRegion, setLayerRegion] = useState<Record<LayerId, RegionLevel>>({
    opportunity: 'kabupaten',
    demographics: 'kabupaten',
    stores: 'kabupaten',
    malls: 'kabupaten',
    competitors: 'kabupaten',
    tourist_pois: 'kabupaten',
    civic_pois: 'kabupaten',
    crowd_density: 'kabupaten',
  })

  // Opportunity metric (only for opportunity layer in choropleth mode)
  const [oppMetric, setOppMetric] = useState<'avg_score' | 'max_score' | 'high_priority_count' | 'store_density'>('avg_score')

  // Demographics metric + granularity
  const [demoMetric, setDemoMetric] = useState<DemoMetric>('income_index')

  // Competitor data (loaded from DB via API)
  const [competitors, setCompetitors] = useState<any[]>([])
  const [competitorBrandFilter, setCompetitorBrandFilter] = useState<string>('all')

  // Demographic data (loaded from DB via API)
  const [kelurahanAll, setKelurahanAll] = useState<any[]>([])
  const [kecamatanAll, setKecamatanAll] = useState<any[]>([])
  const [kabupatenAll, setKabupatenAll] = useState<any[]>([])

  // Load competitors on mount
  useEffect(() => {
    fetch('/api/locinsight/competitors?all=true')
      .then(r => r.json())
      .then(j => { if (j.success) setCompetitors(j.data || []) })
      .catch(() => {})
  }, [])

  // Load kelurahan once
  useEffect(() => {
    fetch('/api/locinsight/kelurahan?all=true')
      .then(r => r.json())
      .then(j => { if (j.success) setKelurahanAll(j.data || []) })
      .catch(() => {})
  }, [])

  // Load kecamatan once
  useEffect(() => {
    fetch('/api/locinsight/kecamatan?all=true')
      .then(r => r.json())
      .then(j => { if (j.success) setKecamatanAll(j.data || []) })
      .catch(() => {})
  }, [])

  // Load kabupaten once
  useEffect(() => {
    fetch('/api/locinsight/kabupaten?page=1&page_size=100')
      .then(r => r.json())
      .then(j => { if (j.success) setKabupatenAll(j.data || []) })
      .catch(() => {})
  }, [])

  // ===== Region Filter (applies to ALL layers) =====
  const [kabFilter, setKabFilter] = useState<string>('all')
  const [kecFilter, setKecFilter] = useState<string>('all')
  const [kelurahanFilter, setKelurahanFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<1 | 2 | 3 | 'all'>('all')
  const [recFilter, setRecFilter] = useState<'all' | 'high_priority' | 'priority' | 'monitor' | 'avoid'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [parentFilter, setParentFilter] = useState<'all' | 'MAP' | 'MAA'>('all')
  const [search, setSearch] = useState('')
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100])

  const selected = opportunities.find(o => o.kelurahan_id === selectedKelurahanId)

  // Build cascading dropdown options from opportunities data
  const kabOptions = useMemo(() => {
    const set = new Set<string>()
    for (const o of opportunities) if (o.kab_name) set.add(o.kab_name)
    return Array.from(set).sort()
  }, [opportunities])

  const kecOptions = useMemo(() => {
    if (kabFilter === 'all') return []
    const set = new Set<string>()
    for (const o of opportunities) {
      if (o.kab_name === kabFilter && o.kec_name) set.add(o.kec_name)
    }
    return Array.from(set).sort()
  }, [opportunities, kabFilter])

  const kelurahanOptions = useMemo(() => {
    if (kecFilter === 'all') return []
    const set = new Set<string>()
    for (const o of opportunities) {
      if (o.kec_name === kecFilter && o.kelurahan_name) set.add(o.kelurahan_name)
    }
    return Array.from(set).sort()
  }, [opportunities, kecFilter])

  // Reset child filters when parent changes
  useEffect(() => {
    if (kabFilter === 'all' && kecFilter !== 'all') setKecFilter('all')
  }, [kabFilter, kecFilter])
  useEffect(() => {
    if (kecFilter === 'all' && kelurahanFilter !== 'all') setKelurahanFilter('all')
  }, [kecFilter, kelurahanFilter])

  const resetFilters = () => {
    setTierFilter('all')
    setRecFilter('all')
    setKabFilter('all')
    setKecFilter('all')
    setKelurahanFilter('all')
    setCategoryFilter('all')
    setParentFilter('all')
    setSearch('')
    setScoreRange([0, 100])
  }

  // Helper: check if a record is in the current region filter
  const isInRegion = (kab?: string, kec?: string, kel?: string) => {
    if (kabFilter !== 'all' && kab !== kabFilter) return false
    if (kecFilter !== 'all' && kec !== kecFilter) return false
    if (kelurahanFilter !== 'all' && kel !== kelurahanFilter) return false
    return true
  }

  // ===== Filter opportunities =====
  const filteredOpps = useMemo(() => {
    const q = search.trim().toLowerCase()
    return opportunities.filter(o => {
      if (tierFilter !== 'all' && o.tier !== tierFilter) return false
      if (recFilter !== 'all' && o.recommendation !== recFilter) return false
      if (!isInRegion(o.kab_name, o.kec_name, o.kelurahan_name)) return false
      if (o.composite_score < scoreRange[0] || o.composite_score > scoreRange[1]) return false
      if (q) {
        const hay = `${o.kelurahan_name} ${o.kec_name} ${o.kab_name}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [opportunities, tierFilter, recFilter, kabFilter, kecFilter, kelurahanFilter, scoreRange, search])

  // ===== Filter stores (region + brand filters) =====
  const filteredStores = useMemo(() => {
    if (!layerOn.stores) return []
    return stores.filter(s => {
      if (tierFilter !== 'all') {
        const kabTier: Record<string, number> = {
          Badung: 1, Denpasar: 1,
          Tabanan: 2, Gianyar: 2, Buleleng: 2,
          Jembrana: 3, Klungkung: 3, Bangli: 3, Karangasem: 3,
        }
        if (kabTier[s.kab] !== tierFilter) return false
      }
      if (!isInRegion(s.kab, s.kec)) return false
      if (categoryFilter !== 'all' && s.brand_category !== categoryFilter) return false
      if (parentFilter !== 'all' && s.parent !== parentFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${s.name} ${s.brand_name} ${s.kab} ${s.kec} ${s.address}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [stores, layerOn.stores, tierFilter, kabFilter, kecFilter, categoryFilter, parentFilter, search])

  // ===== Filter malls (region) =====
  const filteredMalls = useMemo(() => {
    if (!layerOn.malls) return []
    return malls.filter(m => {
      if (tierFilter !== 'all') {
        const kabTier: Record<string, number> = {
          Badung: 1, Denpasar: 1,
          Tabanan: 2, Gianyar: 2, Buleleng: 2,
          Jembrana: 3, Klungkung: 3, Bangli: 3, Karangasem: 3,
        }
        if (kabTier[m.kab] !== tierFilter) return false
      }
      if (!isInRegion(m.kab, m.kec)) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${m.name} ${m.kab} ${m.kec}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [malls, layerOn.malls, tierFilter, kabFilter, kecFilter, search])

  // ===== Filter POIs (region) =====
  const filteredPOIs = useMemo(() => {
    return pois.filter(p => {
      if (!isInRegion(p.kab, p.kec)) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${p.name} ${p.kab} ${p.kec} ${p.type}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [pois, kabFilter, kecFilter, search])

  // ===== Filter competitors (region) =====
  const filteredCompetitors = useMemo(() => {
    if (!layerOn.competitors) return []
    let list = competitors
    if (competitorBrandFilter !== 'all') {
      list = list.filter(c => c.brand_name === competitorBrandFilter)
    }
    return list.filter(c => {
      if (!isInRegion(c.kab, c.kec)) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${c.name} ${c.brand_name} ${c.kab} ${c.kec}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [competitors, layerOn.competitors, competitorBrandFilter, kabFilter, kecFilter, search])

  // ===== Aggregate demographic data based on selected metric + granularity =====
  // The demographics layer always uses layerRegion.demographics as the region level
  const demoGranularity: DemoGranularity = layerRegion.demographics

  const demoData: DemoRegionRow[] = useMemo(() => {
    if (!layerOn.demographics) return []

    // Map demoMetric to kelurahan field name once at top (kelurahan uses `density` not `population_density`)
    const klField: string = demoMetric === 'population_density' ? 'density' : demoMetric

    // Apply region filter to kelurahan data
    const filteredKl = kelurahanAll.filter(kl => {
      if (kabFilter !== 'all' && kl.kab_name !== kabFilter) return false
      if (kecFilter !== 'all' && kl.kec_name !== kecFilter) return false
      if (kelurahanFilter !== 'all' && kl.name !== kelurahanFilter) return false
      return true
    })

    if (demoGranularity === 'kabupaten') {
      if (demoMetric === 'population_density' || demoMetric === 'population') {
        return kabupatenAll
          .filter(k => kabFilter === 'all' || k.name === kabFilter)
          .map(k => ({
            name: k.name,
            value: demoMetric === 'population_density'
              ? (k.population_density ?? null)
              : (k.population_2024 ?? null),
            population: k.population_2024 ?? null,
            kelurahan_count: kelurahanAll.filter(kl => kl.kab_code === k.code).length,
            tier: k.tier ? Number(k.tier.replace('tier_', '')) : null,
          }))
      }
      const byKab = new Map<string, { name: string; sum: number; count: number; pop: number; tier: string | null }>()
      for (const kl of filteredKl) {
        const k = kl.kab_name
        if (!k) continue
        const v = (kl as any)[klField]
        if (v == null) continue
        const r = byKab.get(k) || { name: k, sum: 0, count: 0, pop: 0, tier: kl.tier }
        r.sum += v
        r.count += 1
        r.pop += kl.population || 0
        byKab.set(k, r)
      }
      return Array.from(byKab.values()).map(r => ({
        name: r.name,
        value: r.count > 0 ? r.sum / r.count : null,
        population: r.pop,
        kelurahan_count: r.count,
        tier: r.tier ? Number(r.tier.replace('tier_', '')) : null,
      }))
    }

    if (demoGranularity === 'kecamatan') {
      if (demoMetric === 'population_density' || demoMetric === 'population') {
        return kecamatanAll
          .filter(k => kabFilter === 'all' || k.kabupaten_code === kabupatenAll.find(kb => kb.name === kabFilter)?.code)
          .map(k => ({
            name: k.name,
            value: demoMetric === 'population_density'
              ? (k.population_2024 && k.area_km2 ? k.population_2024 / k.area_km2 : null)
              : (k.population_2024 ?? null),
            population: k.population_2024 ?? null,
            kelurahan_count: kelurahanAll.filter(kl => kl.kec_code === k.code).length,
            tier: k.tier ? Number(k.tier.replace('tier_', '')) : null,
          }))
      }
      const byKec = new Map<string, { name: string; sum: number; count: number; pop: number; tier: string | null }>()
      for (const kl of filteredKl) {
        const k = kl.kec_name
        if (!k) continue
        const v = (kl as any)[klField]
        if (v == null) continue
        const r = byKec.get(k) || { name: k, sum: 0, count: 0, pop: 0, tier: kl.tier }
        r.sum += v
        r.count += 1
        r.pop += kl.population || 0
        byKec.set(k, r)
      }
      return Array.from(byKec.values()).map(r => ({
        name: r.name,
        value: r.count > 0 ? r.sum / r.count : null,
        population: r.pop,
        kelurahan_count: r.count,
        tier: r.tier ? Number(r.tier.replace('tier_', '')) : null,
      }))
    }

    // kelurahan granularity
    return filteredKl.map(kl => ({
      name: kl.name,
      value: (kl as any)[klField] ?? null,
      population: kl.population ?? null,
      kelurahan_count: 1,
      tier: kl.tier ? Number(kl.tier.replace('tier_', '')) : null,
      lat: kl.lat ?? null,
      lng: kl.lng ?? null,
    }))
  }, [layerOn.demographics, demoMetric, demoGranularity, kelurahanAll, kecamatanAll, kabupatenAll, kabFilter, kecFilter, kelurahanFilter])

  const isFilterActive = tierFilter !== 'all' || recFilter !== 'all' || kabFilter !== 'all' ||
    kecFilter !== 'all' || kelurahanFilter !== 'all' ||
    categoryFilter !== 'all' || parentFilter !== 'all' || search !== '' ||
    scoreRange[0] !== 0 || scoreRange[1] !== 100

  // Opportunity layer's region level (for choropleth mode)
  const oppRegion = layerRegion.opportunity
  const oppHeatGranularity = oppRegion === 'kelurahan' ? 'kabupaten' : oppRegion // choropleth-layer only supports kab/kec

  // ===== Region click handler (from choropleth polygon) =====
  // When a choropleth region is clicked, find the top-scoring opportunity in that region
  // and call onSelectKelurahan with its id. This makes the whole region clickable, not
  // just the small CircleMarker at the centroid.
  const handleRegionClick = useCallback((regionName: string, granularity: 'kabupaten' | 'kecamatan') => {
    const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')
    const normalizedRegion = normalize(regionName)
    const candidates = filteredOpps.filter(o => {
      const key = granularity === 'kabupaten' ? o.kab_name : o.kec_name
      return key && normalize(key) === normalizedRegion
    })
    if (candidates.length === 0) return
    // Pick the top-scoring opportunity in the region
    const top = candidates.reduce((best, cur) => cur.composite_score > best.composite_score ? cur : best)
    onSelectKelurahan(top.kelurahan_id)
  }, [filteredOpps, onSelectKelurahan])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
            {t('map.explorer_title')}
          </h2>
          <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
            {t('map.results_summary', {
              kelurahan: filteredOpps.length,
              stores: filteredStores.length,
              malls: filteredMalls.length,
            })}
          </p>
        </div>
        {isFilterActive && (
          <Button size="sm" variant="outline" onClick={resetFilters} className="text-[11px] h-8">
            <RotateCcw className="w-3 h-3 mr-1" />
            {t('map.reset_filters')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Map */}
        <div>
          <LocInsightMap
            opportunities={filteredOpps}
            stores={filteredStores}
            malls={filteredMalls}
            pois={filteredPOIs}
            selectedKelurahanId={selectedKelurahanId}
            onSelectKelurahan={onSelectKelurahan}
            onRegionClick={handleRegionClick}
            showStores={layerOn.stores}
            showMalls={layerOn.malls}
            showCivicPOIs={layerOn.civic_pois}
            showTouristPOIs={layerOn.tourist_pois}
            showHeat={layerOn.opportunity}
            heatMode={layerVizMode.opportunity === 'choropleth' ? 'region' : 'point'}
            heatGranularity={oppHeatGranularity as 'kabupaten' | 'kecamatan'}
            heatMetric={oppMetric}
            tierFilter={tierFilter}
            recommendationFilter={recFilter}
            showCompetitors={layerOn.competitors}
            competitors={filteredCompetitors}
            competitorBrandFilter={competitorBrandFilter}
            showDemographics={layerOn.demographics}
            demoMetric={demoMetric}
            demoGranularity={demoGranularity}
            demoData={demoData}
            showCrowdDensity={layerOn.crowd_density}
            height="calc(100vh - 220px)"
          />
        </div>

        {/* Control panel — single unified scrollable panel */}
        <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto overflow-x-hidden pr-1 -mr-1 scroll-styled">
          {/* ===== Selected card — at TOP, clickable to open Opportunities ===== */}
          {selected ? (
            <Card
              className="card-premium border-[var(--brand-red)] border-2 cursor-pointer hover:shadow-md transition-shadow group"
              onClick={onOpenOpportunities}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onOpenOpportunities) onOpenOpportunities() }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-red)] flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5" />
                  {t('map.selected')}
                  <span className="ml-auto text-[9.5px] normal-case tracking-normal text-[var(--brand-ink)]/45 font-normal flex items-center gap-0.5 group-hover:text-[var(--brand-red)] transition-colors">
                    {t('map.selected.open_opportunities')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="font-display text-[18px] font-bold text-[var(--brand-ink)] leading-tight">
                  {selected.kelurahan_name}
                </div>
                <div className="text-[11.5px] text-[var(--brand-ink)]/60 mb-3">
                  {t('map.selected.region_tier', {
                    kec: selected.kec_name,
                    kab: selected.kab_name,
                    tier: selected.tier,
                  })}
                </div>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">{t('map.selected.composite_score')}</span>
                    <strong className="text-[var(--brand-red)] num-tabular">{selected.composite_score}/100</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">{t('map.selected.market_share')}</span>
                    <strong className="num-tabular">{(selected.potential_market_share * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">{t('map.selected.daily_customers')}</span>
                    <strong className="num-tabular">{selected.estimated_daily_customers}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">{t('map.selected.monthly_revenue')}</span>
                    <strong className="num-tabular">{t('map.selected.revenue_format', { amount: selected.projected_monthly_revenue_juta })}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">{t('map.selected.nearest_mall')}</span>
                    <span className="text-right text-[11px]">{selected.nearest_mall_name?.split(' ')[0] || '—'} ({selected.nearest_mall_distance_km}km)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">{t('map.selected.cannibalization')}</span>
                    <span className="capitalize text-[11px]">{selected.cannibalization_risk}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--brand-border)] text-[11px] text-[var(--brand-ink)]/70 leading-relaxed">
                  {selected.white_space_summary}
                </div>
                {onOpenAnalysis && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenAnalysis() }}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[var(--brand-ink)] text-white text-[11.5px] font-medium hover:bg-[var(--brand-ink)]/90 transition-colors"
                    title="Open Deep Analysis"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    Open in Deep Analysis →
                  </button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="card-premium bg-[var(--brand-cream)] border-dashed">
              <CardContent className="py-6 text-center">
                <Crosshair className="w-6 h-6 mx-auto text-[var(--brand-ink)]/30 mb-2" />
                <div className="text-[12px] text-[var(--brand-ink)]/60">
                  {t('map.selected.empty')}
                </div>
                <div className="text-[10.5px] text-[var(--brand-ink)]/40 mt-1">
                  {t('map.selected.empty_hint')}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                {t('map.region_filters')}
                <span className="ml-auto text-[10px] normal-case tracking-normal text-[var(--brand-ink)]/50 font-normal">
                  {t('map.affects_all_layers')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {/* Search */}
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">{t('common.search')}</Label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--brand-ink)]/40" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('map.search_placeholder')}
                    className="h-9 text-[12px] pl-8"
                  />
                </div>
              </div>

              {/* Cascading region filter */}
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">{t('map.region_cascading')}</Label>
                <Select value={kabFilter} onValueChange={(v) => { setKabFilter(v); setKecFilter('all'); setKelurahanFilter('all'); }}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('map.all_kabupaten_kota')}</SelectItem>
                    {kabOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">
                  {t('map.kecamatan')} {kabFilter !== 'all' ? `(${kecOptions.length})` : t('map.pick_kabupaten_first')}
                </Label>
                <Select value={kecFilter} onValueChange={(v) => { setKecFilter(v); setKelurahanFilter('all'); }} disabled={kabFilter === 'all'}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('map.all_kecamatan')}</SelectItem>
                    {kecOptions.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">
                  {t('map.kelurahan')} {kecFilter !== 'all' ? `(${kelurahanOptions.length})` : t('map.pick_kecamatan_first')}
                </Label>
                <Select value={kelurahanFilter} onValueChange={setKelurahanFilter} disabled={kecFilter === 'all'}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('map.all_kelurahan')}</SelectItem>
                    {kelurahanOptions.slice(0, 200).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">{t('map.tier')}</Label>
                  <Select value={tierFilter.toString()} onValueChange={(v) => setTierFilter(v === 'all' ? 'all' : Number(v) as any)}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all')}</SelectItem>
                      <SelectItem value="1">{t('map.tier_n', { n: 1 })}</SelectItem>
                      <SelectItem value="2">{t('map.tier_n', { n: 2 })}</SelectItem>
                      <SelectItem value="3">{t('map.tier_n', { n: 3 })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">{t('map.recommendation')}</Label>
                  <Select value={recFilter} onValueChange={(v) => setRecFilter(v as any)}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all')}</SelectItem>
                      <SelectItem value="high_priority">{t('map.rec.high_priority')}</SelectItem>
                      <SelectItem value="priority">{t('map.rec.priority')}</SelectItem>
                      <SelectItem value="monitor">{t('map.rec.monitor')}</SelectItem>
                      <SelectItem value="avoid">{t('map.rec.avoid')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60">{t('map.score_range')}</Label>
                  <span className="text-[11px] text-[var(--brand-red)] font-semibold tabular-nums">
                    {scoreRange[0]} – {scoreRange[1]}
                  </span>
                </div>
                <Slider
                  value={scoreRange}
                  onValueChange={(v) => setScoreRange(v as [number, number])}
                  min={0}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div className="pt-2 border-t border-[var(--brand-border)]">
                <Label className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/50 mb-2 block">{t('map.store_only_filters')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">{t('map.brand_category')}</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BRAND_CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">{t('map.parent')}</Label>
                    <Select value={parentFilter} onValueChange={(v) => setParentFilter(v as any)}>
                      <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PARENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ===== Map Layers card ===== */}
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                {t('map.layers')}
                <span className="ml-auto text-[10px] normal-case tracking-normal text-[var(--brand-ink)]/50 font-normal">
                  {t('map.n_active', { n: Object.values(layerOn).filter(Boolean).length })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">

              {/* ===== Opportunity Score ===== */}
              <LayerToggle
                label={t('map.opportunity')}
                desc={t('map.kelurahan_scored', { n: filteredOpps.length })}
                icon={Crosshair}
                checked={layerOn.opportunity}
                onCheckedChange={(v) => setLayerOn({ ...layerOn, opportunity: v })}
                color="var(--brand-red)"
              />
              {layerOn.opportunity && (
                <div className="pl-2 border-l-2 border-[var(--brand-red)]/30 space-y-2 ml-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">{t('map.visualization')}</Label>
                      <Select value={layerVizMode.opportunity} onValueChange={(v) => setLayerVizMode({ ...layerVizMode, opportunity: v as VizMode })}>
                        <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="choropleth">{t('map.viz_choropleth')}</SelectItem>
                          <SelectItem value="point">{t('map.viz_point_heat')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">{t('map.region_level')}</Label>
                      <Select
                        value={layerRegion.opportunity}
                        onValueChange={(v) => setLayerRegion({ ...layerRegion, opportunity: v as RegionLevel })}
                        disabled={layerVizMode.opportunity === 'point'}
                      >
                        <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kabupaten">{t('map.kabupaten_regions')}</SelectItem>
                          <SelectItem value="kecamatan">{t('map.kecamatan_regions')}</SelectItem>
                          {layerVizMode.opportunity === 'point' && (
                            <SelectItem value="kelurahan">{t('map.kelurahan_finest')}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {layerVizMode.opportunity === 'choropleth' && (
                    <div>
                      <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">{t('map.metric')}</Label>
                      <Select value={oppMetric} onValueChange={(v) => setOppMetric(v as any)}>
                        <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="avg_score">{t('map.metric_avg_score')}</SelectItem>
                          <SelectItem value="max_score">{t('map.metric_max_score')}</SelectItem>
                          <SelectItem value="high_priority_count">{t('map.metric_high_priority_count')}</SelectItem>
                          <SelectItem value="store_density">{t('map.metric_store_density')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {layerVizMode.opportunity === 'point' && (
                    <div className="text-[10px] text-[var(--brand-ink)]/50 leading-relaxed bg-[var(--brand-cream)] p-2 rounded">
                      {t('map.point_mode_hint')}
                    </div>
                  )}
                </div>
              )}

              {/* ===== Demographics ===== */}
              <LayerToggle
                label={t('map.demographics')}
                desc={t('map.demographics_desc')}
                icon={TrendingUp}
                checked={layerOn.demographics}
                onCheckedChange={(v) => setLayerOn({ ...layerOn, demographics: v })}
                color="#7c3aed"
              />
              {layerOn.demographics && (
                <div className="pl-2 border-l-2 border-violet-500/30 space-y-2 ml-1">
                  <div>
                    <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">{t('map.metric')}</Label>
                    <Select value={demoMetric} onValueChange={(v) => setDemoMetric(v as DemoMetric)}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEMO_METRIC_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">{t('map.visualization')}</Label>
                      <Select
                        value={layerVizMode.demographics}
                        onValueChange={(v) => setLayerVizMode({ ...layerVizMode, demographics: v as VizMode })}
                      >
                        <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="choropleth">{t('map.viz_choropleth')}</SelectItem>
                          <SelectItem value="point">{t('map.viz_point_village')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">{t('map.region_level')}</Label>
                      <Select
                        value={layerRegion.demographics}
                        onValueChange={(v) => setLayerRegion({ ...layerRegion, demographics: v as RegionLevel })}
                      >
                        <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kabupaten">{t('map.kabupaten_regions')}</SelectItem>
                          <SelectItem value="kecamatan">{t('map.kecamatan_regions')}</SelectItem>
                          <SelectItem value="kelurahan">{t('map.kelurahan_villages')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="text-[10px] text-[var(--brand-ink)]/50 leading-relaxed bg-[var(--brand-cream)] p-2 rounded">
                    {t('map.demographics_hint', { n: demoData.length })}
                  </div>
                </div>
              )}

              {/* ===== Stores ===== */}
              <LayerToggle
                label={t('map.map_maa_stores')}
                desc={t('map.n_of_m_stores', { shown: filteredStores.length, total: stores.length })}
                icon={StoreIcon}
                checked={layerOn.stores}
                onCheckedChange={(v) => setLayerOn({ ...layerOn, stores: v })}
                color="var(--brand-red)"
              />

              {/* ===== Malls ===== */}
              <LayerToggle
                label={t('map.shopping_malls')}
                desc={t('map.n_of_m_malls', { shown: filteredMalls.length, total: malls.length })}
                icon={Building2}
                checked={layerOn.malls}
                onCheckedChange={(v) => setLayerOn({ ...layerOn, malls: v })}
                color="var(--brand-ink)"
              />

              {/* ===== Competitor Stores ===== */}
              <LayerToggle
                label={t('map.competitor_stores')}
                desc={t('map.n_of_m_competitors', { shown: filteredCompetitors.length, total: competitors.length })}
                icon={Shield}
                checked={layerOn.competitors}
                onCheckedChange={(v) => setLayerOn({ ...layerOn, competitors: v })}
                color="#dc2626"
              />
              {layerOn.competitors && competitors.length > 0 && (
                <div className="pl-2 border-l-2 border-red-500/30 space-y-2 ml-1">
                  <div>
                    <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">{t('map.brand_filter')}</Label>
                    <Select value={competitorBrandFilter} onValueChange={setCompetitorBrandFilter}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('map.all_brands', { n: competitors.length })}</SelectItem>
                        {Array.from(new Set(competitors.map(c => c.brand_name))).sort().map(b => (
                          <SelectItem key={b} value={b}>{b} ({competitors.filter(c => c.brand_name === b).length})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* ===== Tourist POIs ===== */}
              <LayerToggle
                label={t('map.tourist_attractions')}
                desc={t('map.tourist_attractions_desc', { n: filteredPOIs.filter(p => ['tourist_attraction','beach','temple','hotel_cluster'].includes(p.type)).length })}
                icon={Sparkles}
                checked={layerOn.tourist_pois}
                onCheckedChange={(v) => setLayerOn({ ...layerOn, tourist_pois: v })}
                color="#0891b2"
              />

              {/* ===== Civic POIs ===== */}
              <LayerToggle
                label={t('map.civic_pois')}
                desc={t('map.civic_pois_desc', { n: filteredPOIs.filter(p => !['tourist_attraction','beach','temple','hotel_cluster'].includes(p.type)).length })}
                icon={MapPin}
                checked={layerOn.civic_pois}
                onCheckedChange={(v) => setLayerOn({ ...layerOn, civic_pois: v })}
                color="#5C5C5C"
              />

              {/* ===== Crowd Density ===== */}
              <LayerToggle
                label={t('map.crowd_density')}
                desc={t('map.crowd_density_desc')}
                icon={Activity}
                checked={layerOn.crowd_density}
                onCheckedChange={(v) => setLayerOn({ ...layerOn, crowd_density: v })}
                color="#ea580c"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function LayerToggle({
  label, desc, icon: Icon, checked, onCheckedChange, color
}: {
  label: string
  desc: string
  icon: any
  checked: boolean
  onCheckedChange: (v: boolean) => void
  color: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: checked ? color : 'var(--brand-cream)', color: checked ? 'white' : 'var(--brand-ink)' }}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <Label className="text-[12px] font-medium text-[var(--brand-ink)] cursor-pointer">{label}</Label>
          <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
        <div className="text-[10.5px] text-[var(--brand-ink)]/55 mt-0.5">{desc}</div>
      </div>
    </div>
  )
}
