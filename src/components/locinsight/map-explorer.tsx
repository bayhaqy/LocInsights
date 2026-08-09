'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  MapPin, Building2, Compass, Filter, Crosshair, Search, RotateCcw,
  Shield, TrendingUp, Activity, Users, Sparkles, Banknote, Bus, Factory,
} from 'lucide-react'
import { Store as StoreIcon } from 'lucide-react'
import type { OpportunityScore, Store, Mall, POI } from './types'
import { Button } from '@/components/ui/button'
import type { DemoMetric, DemoGranularity, DemoRegionRow } from './choropleth-demographics-layer'

interface MapExplorerProps {
  opportunities: OpportunityScore[]
  stores: Store[]
  malls: Mall[]
  pois: POI[]
  selectedKelurahanId: string | null
  onSelectKelurahan: (id: string) => void
}

// Dynamic import with ssr:false to avoid Leaflet's window reference during SSR
const LocInsightMap = dynamic(
  () => import('./locinsight-map').then(mod => ({ default: mod.LocInsightMap })),
  { ssr: false, loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--brand-cream)] rounded-lg border border-[var(--brand-border)]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[var(--brand-red)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <div className="text-[12px] text-[var(--brand-ink)]/60">Loading map…</div>
      </div>
    </div>
  ) }
)

const KABUPATEN_OPTIONS = [
  { value: 'all', label: 'All Kabupaten/Kota' },
  { value: 'Badung', label: 'Badung (Kuta, Seminyak, Nusa Dua, Bukit)' },
  { value: 'Denpasar', label: 'Denpasar (Kota)' },
  { value: 'Gianyar', label: 'Gianyar (Ubud, Sukawati)' },
  { value: 'Tabanan', label: 'Tabanan' },
  { value: 'Buleleng', label: 'Buleleng (Singaraja)' },
  { value: 'Karangasem', label: 'Karangasem (Amlapura, Candidasa)' },
  { value: 'Bangli', label: 'Bangli (Kintamani)' },
  { value: 'Klungkung', label: 'Klungkung (incl. Nusa Penida)' },
  { value: 'Jembrana', label: 'Jembrana (Negara, Gilimanuk)' },
]

const BRAND_CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'sports', label: 'Sports' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'department_store', label: 'Department Store' },
  { value: 'kids', label: 'Kids' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'athleisure', label: 'Athleisure' },
  { value: 'footwear', label: 'Footwear' },
]

const PARENT_OPTIONS = [
  { value: 'all', label: 'MAP & MAA (All)' },
  { value: 'MAP', label: 'MAP only (PT Mitra Adiperkasa)' },
  { value: 'MAA', label: 'MAA only (MAP Active Adiperkasa)' },
]

// Demographics metric options
const DEMO_METRIC_OPTIONS: { value: DemoMetric; label: string; icon: any; color: string }[] = [
  { value: 'income_index', label: 'Income Index', icon: Banknote, color: '#31a354' },
  { value: 'urban_index', label: 'Urbanization Index', icon: Building2, color: '#fd8d3c' },
  { value: 'tourist_index', label: 'Tourist Index', icon: Sparkles, color: '#41ae76' },
  { value: 'transport_index', label: 'Transport Index', icon: Bus, color: '#8856a7' },
  { value: 'poi_density_index', label: 'POI Density Index', icon: MapPin, color: '#ec7014' },
  { value: 'population_density', label: 'Population Density', icon: Users, color: '#ef3b2c' },
  { value: 'population', label: 'Population', icon: Users, color: '#3182bd' },
]

const DEMO_GRANULARITY_OPTIONS: { value: DemoGranularity; label: string }[] = [
  { value: 'kabupaten', label: 'Per Kabupaten/Kota (9 regions)' },
  { value: 'kecamatan', label: 'Per Kecamatan (59 regions)' },
]

export function MapExplorer({
  opportunities, stores, malls, pois, selectedKelurahanId, onSelectKelurahan,
}: MapExplorerProps) {
  // ===== Layer toggles =====
  // Base layers
  const [showStores, setShowStores] = useState(true)
  const [showMalls, setShowMalls] = useState(true)

  // Analysis layers
  const [showHeat, setShowHeat] = useState(true)
  const [heatMode, setHeatMode] = useState<'region' | 'point'>('region')
  const [heatGranularity, setHeatGranularity] = useState<'kabupaten' | 'kecamatan'>('kabupaten')
  const [heatMetric, setHeatMetric] = useState<'avg_score' | 'max_score' | 'high_priority_count' | 'store_density'>('avg_score')

  // Points of Interest — split into tourist & civic (mutually distinct)
  const [showTouristPOIs, setShowTouristPOIs] = useState(false)
  const [showCivicPOIs, setShowCivicPOIs] = useState(false)

  // Demographics choropleth
  const [showDemographics, setShowDemographics] = useState(false)
  const [demoMetric, setDemoMetric] = useState<DemoMetric>('income_index')
  const [demoGranularity, setDemoGranularity] = useState<DemoGranularity>('kabupaten')

  // Competitive layers
  const [showCompetitors, setShowCompetitors] = useState(false)
  const [showCrowdDensity, setShowCrowdDensity] = useState(false)

  // Competitor data (loaded from DB via API)
  const [competitors, setCompetitors] = useState<any[]>([])
  const [competitorBrandFilter, setCompetitorBrandFilter] = useState<string>('all')

  // Demographic data (loaded from DB via API — kelurahan + kecamatan + kabupaten)
  const [kelurahanAll, setKelurahanAll] = useState<any[]>([])
  const [kecamatanAll, setKecamatanAll] = useState<any[]>([])
  const [kabupatenAll, setKabupatenAll] = useState<any[]>([])

  // Load competitors on mount (lazy)
  useEffect(() => {
    fetch('/api/locinsight/competitors?all=true')
      .then(r => r.json())
      .then(j => { if (j.success) setCompetitors(j.data || []) })
      .catch(() => {})
  }, [])

  // Load kelurahan once (used for demographics aggregation at any granularity)
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

  // ===== Filters =====
  const [tierFilter, setTierFilter] = useState<1 | 2 | 3 | 'all'>('all')
  const [recFilter, setRecFilter] = useState<'all' | 'high_priority' | 'priority' | 'monitor' | 'avoid'>('all')
  const [kabFilter, setKabFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [parentFilter, setParentFilter] = useState<'all' | 'MAP' | 'MAA'>('all')
  const [search, setSearch] = useState('')
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100])

  const selected = opportunities.find(o => o.kelurahan_id === selectedKelurahanId)

  const resetFilters = () => {
    setTierFilter('all')
    setRecFilter('all')
    setKabFilter('all')
    setCategoryFilter('all')
    setParentFilter('all')
    setSearch('')
    setScoreRange([0, 100])
  }

  const filteredOpps = useMemo(() => {
    const q = search.trim().toLowerCase()
    return opportunities.filter(o => {
      if (tierFilter !== 'all' && o.tier !== tierFilter) return false
      if (recFilter !== 'all' && o.recommendation !== recFilter) return false
      if (kabFilter !== 'all' && o.kab_name !== kabFilter) return false
      if (o.composite_score < scoreRange[0] || o.composite_score > scoreRange[1]) return false
      if (q) {
        const hay = `${o.kelurahan_name} ${o.kec_name} ${o.kab_name}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [opportunities, tierFilter, recFilter, kabFilter, scoreRange, search])

  const filteredStores = useMemo(() => {
    if (!showStores) return []
    return stores.filter(s => {
      if (tierFilter !== 'all') {
        const kabTier: Record<string, number> = {
          Badung: 1, Denpasar: 1,
          Tabanan: 2, Gianyar: 2, Buleleng: 2,
          Jembrana: 3, Klungkung: 3, Bangli: 3, Karangasem: 3,
        }
        if (kabTier[s.kab] !== tierFilter) return false
      }
      if (kabFilter !== 'all' && s.kab !== kabFilter) return false
      if (categoryFilter !== 'all' && s.brand_category !== categoryFilter) return false
      if (parentFilter !== 'all' && s.parent !== parentFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${s.name} ${s.brand_name} ${s.kab} ${s.kec} ${s.address}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [stores, showStores, tierFilter, kabFilter, categoryFilter, parentFilter, search])

  // ===== Aggregate demographic data based on selected metric + granularity =====
  const demoData: DemoRegionRow[] = useMemo(() => {
    if (!showDemographics) return []

    if (demoGranularity === 'kabupaten') {
      // Aggregate from kelurahan → kabupaten (more accurate than using kabupaten.tier directly)
      // but for population_density and gdrp_per_capita_juta we use the kabupaten record itself
      if (demoMetric === 'population_density' || demoMetric === 'population') {
        return kabupatenAll.map(k => ({
          name: k.name,
          value: demoMetric === 'population_density'
            ? (k.population_density ?? null)
            : (k.population_2024 ?? null),
          population: k.population_2024 ?? null,
          kelurahan_count: kelurahanAll.filter(kl => kl.kab_code === k.code).length,
          tier: k.tier ? Number(k.tier.replace('tier_', '')) : null,
        }))
      }
      // For indices (income/urban/tourist/etc.) — aggregate kelurahan up to kabupaten
      const byKab = new Map<string, { name: string; sum: number; count: number; pop: number; tier: string | null }>()
      for (const kl of kelurahanAll) {
        const k = kl.kab_name
        if (!k) continue
        const v = kl[demoMetric]
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

    // kecamatan granularity
    if (demoMetric === 'population_density' || demoMetric === 'population') {
      return kecamatanAll.map(k => ({
        name: k.name,
        value: demoMetric === 'population_density'
          ? (k.population_2024 && k.area_km2 ? k.population_2024 / k.area_km2 : null)
          : (k.population_2024 ?? null),
        population: k.population_2024 ?? null,
        kelurahan_count: kelurahanAll.filter(kl => kl.kec_code === k.code).length,
        tier: k.tier ? Number(k.tier.replace('tier_', '')) : null,
      }))
    }
    // For indices — aggregate kelurahan up to kecamatan
    const byKec = new Map<string, { name: string; sum: number; count: number; pop: number; tier: string | null }>()
    for (const kl of kelurahanAll) {
      const k = kl.kec_name
      if (!k) continue
      const v = kl[demoMetric]
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
  }, [showDemographics, demoMetric, demoGranularity, kelurahanAll, kecamatanAll, kabupatenAll])

  const isFilterActive = tierFilter !== 'all' || recFilter !== 'all' || kabFilter !== 'all' ||
    categoryFilter !== 'all' || parentFilter !== 'all' || search !== '' ||
    scoreRange[0] !== 0 || scoreRange[1] !== 100

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
            Interactive Map Explorer
          </h2>
          <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
            {filteredOpps.length} kelurahan · {filteredStores.length} stores ditampilkan dari total {opportunities.length} kelurahan & {stores.length} stores
          </p>
        </div>
        {isFilterActive && (
          <Button size="sm" variant="outline" onClick={resetFilters} className="text-[11px] h-8">
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* Map */}
        <div>
          <LocInsightMap
            opportunities={filteredOpps}
            stores={filteredStores}
            malls={malls}
            pois={pois}
            selectedKelurahanId={selectedKelurahanId}
            onSelectKelurahan={onSelectKelurahan}
            showStores={showStores}
            showMalls={showMalls}
            showCivicPOIs={showCivicPOIs}
            showTouristPOIs={showTouristPOIs}
            showHeat={showHeat}
            heatMode={heatMode}
            heatGranularity={heatGranularity}
            heatMetric={heatMetric}
            tierFilter={tierFilter}
            recommendationFilter={recFilter}
            showCompetitors={showCompetitors}
            competitors={competitors}
            competitorBrandFilter={competitorBrandFilter}
            showDemographics={showDemographics}
            demoMetric={demoMetric}
            demoGranularity={demoGranularity}
            demoData={demoData}
            showCrowdDensity={showCrowdDensity}
            height="calc(100vh - 220px)"
          />
        </div>

        {/* Control panel */}
        <div className="space-y-3">
          {/* Filters card */}
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Search</Label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--brand-ink)]/40" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Kelurahan, kecamatan, store name…"
                    className="h-9 text-[12px] pl-8"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Kabupaten/Kota</Label>
                <Select value={kabFilter} onValueChange={setKabFilter}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KABUPATEN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Tier</Label>
                  <Select value={tierFilter.toString()} onValueChange={(v) => setTierFilter(v === 'all' ? 'all' : Number(v) as any)}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="1">Tier 1</SelectItem>
                      <SelectItem value="2">Tier 2</SelectItem>
                      <SelectItem value="3">Tier 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Recommendation</Label>
                  <Select value={recFilter} onValueChange={(v) => setRecFilter(v as any)}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="high_priority">High Priority</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="monitor">Monitor</SelectItem>
                      <SelectItem value="avoid">Avoid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60">Score Range</Label>
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
                <Label className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/50 mb-2 block">Store Filters (affects store markers only)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Brand Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BRAND_CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Parent</Label>
                    <Select value={parentFilter} onValueChange={(v) => setParentFilter(v as any)}>
                      <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PARENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Layers card — reorganized, no "Phase 4" labels */}
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">

              {/* ===== Analysis: Opportunity choropleth ===== */}
              <LayerToggle
                label="Opportunity Score"
                desc={heatMode === 'region'
                  ? (heatGranularity === 'kabupaten' ? 'Choropleth per kabupaten (9 regions)' : 'Choropleth per kecamatan (59 regions)')
                  : 'Point intensity (per kelurahan)'}
                icon={Crosshair}
                checked={showHeat}
                onCheckedChange={setShowHeat}
                color="var(--brand-red)"
              />
              {showHeat && (
                <div className="pl-2 border-l-2 border-[var(--brand-red)]/30 space-y-2 ml-1">
                  <div>
                    <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">Visualization Type</Label>
                    <Select value={heatMode} onValueChange={(v) => setHeatMode(v as 'region' | 'point')}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="region">Choropleth (Region fill)</SelectItem>
                        <SelectItem value="point">Point Heat (Per kelurahan)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {heatMode === 'region' && (
                    <div>
                      <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">Granularity</Label>
                      <Select value={heatGranularity} onValueChange={(v) => setHeatGranularity(v as 'kabupaten' | 'kecamatan')}>
                        <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kabupaten">Per Kabupaten/Kota (9)</SelectItem>
                          <SelectItem value="kecamatan">Per Kecamatan (59)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">Metric</Label>
                    <Select value={heatMetric} onValueChange={(v) => setHeatMetric(v as any)}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avg_score">Average composite score</SelectItem>
                        <SelectItem value="max_score">Best score in region</SelectItem>
                        <SelectItem value="high_priority_count"># high-priority sites</SelectItem>
                        <SelectItem value="store_density"># kelurahan covered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* ===== Demographics choropleth (NEW — proper choropleth for income, urban, etc.) ===== */}
              <LayerToggle
                label="Demographics Choropleth"
                desc="Income, urbanization, tourism, transport, population — by admin boundary"
                icon={TrendingUp}
                checked={showDemographics}
                onCheckedChange={setShowDemographics}
                color="#7c3aed"
              />
              {showDemographics && (
                <div className="pl-2 border-l-2 border-violet-500/30 space-y-2 ml-1">
                  <div>
                    <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">Metric</Label>
                    <Select value={demoMetric} onValueChange={(v) => setDemoMetric(v as DemoMetric)}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEMO_METRIC_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">Granularity</Label>
                    <Select value={demoGranularity} onValueChange={(v) => setDemoGranularity(v as DemoGranularity)}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEMO_GRANULARITY_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-[10px] text-[var(--brand-ink)]/50 leading-relaxed bg-[var(--brand-cream)] p-2 rounded">
                    {demoData.length} regions aggregated · data from {demoGranularity === 'kabupaten' ? 'kabupaten + kelurahan' : 'kecamatan + kelurahan'} BPS sources
                  </div>
                </div>
              )}

              {/* ===== Base: MAP/MAA Stores ===== */}
              <LayerToggle
                label="MAP / MAA Stores"
                desc={`${filteredStores.length} of ${stores.length} stores shown`}
                icon={StoreIcon}
                checked={showStores}
                onCheckedChange={setShowStores}
                color="var(--brand-red)"
              />

              {/* ===== Base: Malls ===== */}
              <LayerToggle
                label="Shopping Malls"
                desc={`${malls.length} shopping centers`}
                icon={Building2}
                checked={showMalls}
                onCheckedChange={setShowMalls}
                color="var(--brand-ink)"
              />

              {/* ===== Competitor Stores ===== */}
              <LayerToggle
                label="Competitor Stores"
                desc={`${competitors.length} competitors (Indomaret, Alfamart, KFC, McDonald's, dll)`}
                icon={Shield}
                checked={showCompetitors}
                onCheckedChange={setShowCompetitors}
                color="#dc2626"
              />
              {showCompetitors && competitors.length > 0 && (
                <div className="pl-2 border-l-2 border-red-500/30 space-y-2 ml-1">
                  <div>
                    <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">Filter by Brand</Label>
                    <Select value={competitorBrandFilter} onValueChange={setCompetitorBrandFilter}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands ({competitors.length})</SelectItem>
                        {Array.from(new Set(competitors.map(c => c.brand_name))).sort().map(b => (
                          <SelectItem key={b} value={b}>{b} ({competitors.filter(c => c.brand_name === b).length})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* ===== Tourist POIs (beaches, temples, attractions, hotels) ===== */}
              <LayerToggle
                label="Tourist Attractions"
                desc={`Beaches, temples, attractions, hotels (${pois.filter(p => ['tourist_attraction','beach','temple','hotel_cluster'].includes(p.type)).length} from OSM)`}
                icon={Sparkles}
                checked={showTouristPOIs}
                onCheckedChange={setShowTouristPOIs}
                color="#0891b2"
              />

              {/* ===== Civic POIs (transit, university, hospital, etc.) ===== */}
              <LayerToggle
                label="Civic POIs"
                desc={`Universities, hospitals, transit hubs, government, ports (${pois.filter(p => !['tourist_attraction','beach','temple','hotel_cluster'].includes(p.type)).length} from OSM)`}
                icon={MapPin}
                checked={showCivicPOIs}
                onCheckedChange={setShowCivicPOIs}
                color="#5C5C5C"
              />

              {/* ===== Crowd density heat ===== */}
              <LayerToggle
                label="Crowd Density"
                desc="Foot traffic estimate (POI + mall + store density)"
                icon={Activity}
                checked={showCrowdDensity}
                onCheckedChange={setShowCrowdDensity}
                color="#ea580c"
              />
            </CardContent>
          </Card>

          {/* Selected kelurahan card */}
          {selected ? (
            <Card className="card-premium border-[var(--brand-red)] border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-red)] flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5" />
                  Selected
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="font-display text-[18px] font-bold text-[var(--brand-ink)] leading-tight">
                  {selected.kelurahan_name}
                </div>
                <div className="text-[11.5px] text-[var(--brand-ink)]/60 mb-3">
                  {selected.kec_name}, {selected.kab_name} · Tier {selected.tier}
                </div>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">Composite Score</span>
                    <strong className="text-[var(--brand-red)] num-tabular">{selected.composite_score}/100</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">Market Share</span>
                    <strong className="num-tabular">{(selected.potential_market_share * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">Daily Customers</span>
                    <strong className="num-tabular">{selected.estimated_daily_customers}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">Monthly Revenue</span>
                    <strong className="num-tabular">Rp {selected.projected_monthly_revenue_juta}jt</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">Nearest Mall</span>
                    <span className="text-right text-[11px]">{selected.nearest_mall_name?.split(' ')[0] || '—'} ({selected.nearest_mall_distance_km}km)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--brand-ink)]/60">Cannibalization</span>
                    <span className="capitalize text-[11px]">{selected.cannibalization_risk}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--brand-border)] text-[11px] text-[var(--brand-ink)]/70 leading-relaxed">
                  {selected.white_space_summary}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-premium bg-[var(--brand-cream)]">
              <CardContent className="py-6 text-center">
                <Crosshair className="w-6 h-6 mx-auto text-[var(--brand-ink)]/30 mb-2" />
                <div className="text-[12px] text-[var(--brand-ink)]/60">
                  Klik marker di peta untuk melihat detail kelurahan
                </div>
              </CardContent>
            </Card>
          )}
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
