'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { MapPin, Building2, Compass, Filter, Crosshair, Search, RotateCcw } from 'lucide-react'
import { Store as StoreIcon } from 'lucide-react'
import type { OpportunityScore, Store, Mall, POI } from './types'
import { Button } from '@/components/ui/button'

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

export function MapExplorer({
  opportunities, stores, malls, pois, selectedKelurahanId, onSelectKelurahan,
}: MapExplorerProps) {
  // Layer toggles
  const [showStores, setShowStores] = useState(true)
  const [showMalls, setShowMalls] = useState(true)
  const [showPOIs, setShowPOIs] = useState(false)
  const [showHeat, setShowHeat] = useState(true)
  const [heatMode, setHeatMode] = useState<'point' | 'region'>('region')
  const [heatMetric, setHeatMetric] = useState<'avg_score' | 'max_score' | 'high_priority_count' | 'store_density'>('avg_score')

  // Filters
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
            showPOIs={showPOIs}
            showHeat={showHeat}
            heatMode={heatMode}
            heatMetric={heatMetric}
            tierFilter={tierFilter}
            recommendationFilter={recFilter}
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
              {/* Search */}
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

              {/* Kabupaten */}
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Kabupaten/Kota</Label>
                <Select value={kabFilter} onValueChange={setKabFilter}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KABUPATEN_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Tier + Recommendation side by side */}
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

              {/* Score range slider */}
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

              {/* Store-specific filters */}
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

          {/* Layers card */}
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <LayerToggle
                label="Opportunity Heat"
                desc={heatMode === 'region' ? 'Regional choropleth (kabupaten)' : 'Point intensity (per kelurahan)'}
                icon={Crosshair}
                checked={showHeat}
                onCheckedChange={setShowHeat}
                color="var(--brand-red)"
              />
              {showHeat && (
                <div className="pl-2 border-l-2 border-[var(--brand-red)]/30 space-y-2 ml-1">
                  <div>
                    <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">Heat Mode</Label>
                    <Select value={heatMode} onValueChange={(v) => setHeatMode(v as 'point' | 'region')}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="region">Regional (per Kabupaten)</SelectItem>
                        <SelectItem value="point">Point (per Kelurahan)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {heatMode === 'region' && (
                    <div>
                      <Label className="text-[10.5px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">Region Metric</Label>
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
                  )}
                </div>
              )}
              <LayerToggle
                label="Existing MAP/MAA Stores"
                desc={`${filteredStores.length} of ${stores.length} stores shown`}
                icon={StoreIcon}
                checked={showStores}
                onCheckedChange={setShowStores}
                color="var(--brand-red)"
              />
              <LayerToggle
                label="Malls"
                desc={`${malls.length} shopping centers`}
                icon={Building2}
                checked={showMalls}
                onCheckedChange={setShowMalls}
                color="var(--brand-ink)"
              />
              <LayerToggle
                label="Points of Interest"
                desc={`${pois.length} tourist + transit POIs`}
                icon={MapPin}
                checked={showPOIs}
                onCheckedChange={setShowPOIs}
                color="var(--brand-ink)"
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
