'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Building2, Store, Compass, Filter, Crosshair } from 'lucide-react'
import type { OpportunityScore, Store, Mall, POI } from './types'

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

export function MapExplorer({
  opportunities, stores, malls, pois, selectedKelurahanId, onSelectKelurahan,
}: MapExplorerProps) {
  const [showStores, setShowStores] = useState(true)
  const [showMalls, setShowMalls] = useState(true)
  const [showPOIs, setShowPOIs] = useState(false)
  const [showHeat, setShowHeat] = useState(true)
  const [tierFilter, setTierFilter] = useState<1 | 2 | 3 | 'all'>('all')
  const [recFilter, setRecFilter] = useState<'all' | 'high_priority' | 'priority' | 'monitor' | 'avoid'>('all')

  const selected = opportunities.find(o => o.kelurahan_id === selectedKelurahanId)

  const filteredCount = useMemo(() => {
    return opportunities.filter(o => {
      if (tierFilter !== 'all' && o.tier !== tierFilter) return false
      if (recFilter !== 'all' && o.recommendation !== recFilter) return false
      return true
    }).length
  }, [opportunities, tierFilter, recFilter])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
            Interactive Map Explorer
          </h2>
          <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
            {filteredCount} kelurahan ditampilkan dari total {opportunities.length} · klik marker untuk detail
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Map */}
        <div>
          <LocInsightMap
            opportunities={opportunities}
            stores={stores}
            malls={malls}
            pois={pois}
            selectedKelurahanId={selectedKelurahanId}
            onSelectKelurahan={onSelectKelurahan}
            showStores={showStores}
            showMalls={showMalls}
            showPOIs={showPOIs}
            showHeat={showHeat}
            tierFilter={tierFilter}
            recommendationFilter={recFilter}
            height="calc(100vh - 220px)"
          />
        </div>

        {/* Control panel */}
        <div className="space-y-3">
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Tier</Label>
                <Select value={tierFilter.toString()} onValueChange={(v) => setTierFilter(v === 'all' ? 'all' : Number(v) as any)}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="1">Tier 1 — Mature (Badung, Denpasar)</SelectItem>
                    <SelectItem value="2">Tier 2 — Growth (Gianyar, Tabanan, Buleleng)</SelectItem>
                    <SelectItem value="3">Tier 3 — Untapped (4 kabupaten)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Recommendation</Label>
                <Select value={recFilter} onValueChange={(v) => setRecFilter(v as any)}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Recommendations</SelectItem>
                    <SelectItem value="high_priority">High Priority Only</SelectItem>
                    <SelectItem value="priority">Priority+</SelectItem>
                    <SelectItem value="monitor">Monitor+</SelectItem>
                    <SelectItem value="avoid">Show All (incl. Avoid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

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
                desc="Colored circles by score"
                icon={Crosshair}
                checked={showHeat}
                onCheckedChange={setShowHeat}
                color="var(--brand-red)"
              />
              <LayerToggle
                label="Existing MAP Stores"
                desc={`${stores.length} stores (80 confirmed + estimates)`}
                icon={Store}
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
