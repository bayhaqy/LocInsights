'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Crosshair, TrendingUp, Store as StoreIcon, Building2, MapPin, AlertCircle,
  Activity, DollarSign, Users, Target, CheckCircle2, Info,
} from 'lucide-react'
import type { OpportunityScore, Brand, KelurahanLite, Store, Mall, POI } from './types'

interface AnalysisProps {
  kelurahanList: KelurahanLite[]
  brands: Brand[]
  selectedKelurahanId: string | null
  onSelectKelurahan: (id: string) => void
}

export function Analysis({ kelurahanList, brands, selectedKelurahanId, onSelectKelurahan }: AnalysisProps) {
  const [brandId, setBrandId] = useState<string>('')
  const [data, setData] = useState<null | {
    kelurahan: KelurahanLite & { mall_proximity_index: number; existing_store_density: number }
    score: OpportunityScore
    nearby_stores: (Store & { distance_km: number })[]
    nearby_malls: (Mall & { distance_km: number })[]
    nearby_pois: (POI & { distance_km: number })[]
  }>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group kelurahan by tier for select
  const kelByTier: Record<number, KelurahanLite[]> = { 1: [], 2: [], 3: [] }
  for (const k of kelurahanList) kelByTier[k.tier].push(k)

  useEffect(() => {
    if (!selectedKelurahanId) return
    setLoading(true)
    setError(null)
    const url = `/api/locinsight/analyze?kelurahan_id=${selectedKelurahanId}${brandId ? `&brand_id=${brandId}` : ''}`
    fetch(url)
      .then(r => r.json())
      .then(j => {
        if (j.success) setData(j.data)
        else setError(j.error || 'Failed to load')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedKelurahanId, brandId])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          Location Deep Analysis
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          Pilih kelurahan untuk melihat trade area, kompetisi terdekat, mall coverage, dan proyeksi revenue
        </p>
      </div>

      {/* Selectors */}
      <Card className="card-premium">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">
                Kelurahan / Desa
              </label>
              <Select value={selectedKelurahanId || '__none__'} onValueChange={(v) => v !== '__none__' && onSelectKelurahan(v)}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Pilih kelurahan…" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  {[1, 2, 3].map(tier => (
                    <SelectGroup key={tier}>
                      <SelectLabel className="text-[10px] uppercase tracking-wider text-[var(--brand-red)] font-bold">
                        Tier {tier} ({kelByTier[tier].length} kelurahan)
                      </SelectLabel>
                      {kelByTier[tier].map(k => (
                        <SelectItem key={k.id} value={k.id} className="text-[12px]">
                          {k.name} — {k.kec_name}, {k.kab_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">
                Target Brand (optional)
              </label>
              <Select value={brandId || '__none__'} onValueChange={(v) => setBrandId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Generic (no brand filter)" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="__none__">Generic (no brand filter)</SelectItem>
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-bold">MAP Brands</SelectLabel>
                    {brands.filter(b => b.parent === 'MAP').map(b => (
                      <SelectItem key={b.id} value={b.id} className="text-[12px]">{b.name} ({b.category.replace('_', ' ')})</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-bold">MAP Active Brands</SelectLabel>
                    {brands.filter(b => b.parent === 'MAA').map(b => (
                      <SelectItem key={b.id} value={b.id} className="text-[12px]">{b.name} ({b.category.replace('_', ' ')})</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedKelurahanId && (
        <Card className="card-premium bg-[var(--brand-cream)]">
          <CardContent className="py-12 text-center">
            <Crosshair className="w-8 h-8 mx-auto text-[var(--brand-ink)]/30 mb-3" />
            <div className="text-[14px] text-[var(--brand-ink)]/60">
              Pilih kelurahan di atas untuk memulai analisis mendalam
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {error && (
        <Card className="card-premium border-red-300">
          <CardContent className="p-4 text-[13px] text-red-700">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            {error}
          </CardContent>
        </Card>
      )}

      {data && !loading && <AnalysisView data={data} />}
    </div>
  )
}

function AnalysisView({ data }: { data: any }) {
  const { kelurahan, score, nearby_stores, nearby_malls, nearby_pois } = data

  return (
    <div className="space-y-4">
      {/* Header summary card */}
      <Card className="card-premium bg-[var(--brand-ink)] text-white border-0">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-medium">Tier {kelurahan.tier}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{
                  background: score.recommendation === 'high_priority' ? 'var(--brand-red)' :
                             score.recommendation === 'priority' ? '#D45F4A' : '#A08070'
                }}>
                  {score.recommendation.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <h3 className="font-display text-[28px] font-bold leading-tight">{kelurahan.name}</h3>
              <div className="text-[13px] text-white/70 mt-1">
                {kelurahan.kec_name} · {kelurahan.kab_name}
              </div>
              <div className="text-[11px] text-white/50 mt-1">
                {kelurahan.population.toLocaleString()} penduduk · {kelurahan.area_km2} km² · density {kelurahan.density}/km²
                {kelurahan.is_coastal && ' · coastal area'}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <BigStat label="Composite" value={score.composite_score.toString()} suffix="/100" icon={Target} />
              <BigStat label="Market Share" value={(score.potential_market_share * 100).toFixed(1)} suffix="%" icon={Activity} />
              <BigStat label="Daily Cust." value={score.estimated_daily_customers.toString()} icon={Users} />
              <BigStat label="Rev/mo" value={`${score.projected_monthly_revenue_juta}`} suffix="jt" icon={DollarSign} accent="red" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Factor breakdown */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--brand-red)]" />
            Composite Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {score.factors.map(f => (
            <div key={f.name}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--brand-ink)]">{f.name}</span>
                  <span className="text-[10px] text-[var(--brand-ink)]/40 uppercase tracking-wider">
                    weight {(f.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 num-tabular">
                  <span className="text-[var(--brand-ink)]/50 text-[11px]">{f.raw_value}/100</span>
                  <span className="text-[var(--brand-red)] font-bold text-[13px]">+{f.weighted.toFixed(1)}</span>
                </div>
              </div>
              <div className="h-2 bg-[var(--brand-cream)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${f.raw_value}%`,
                    background: f.raw_value >= 70 ? 'var(--brand-red)' : f.raw_value >= 50 ? '#D45F4A' : '#A08070'
                  }}
                />
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-[var(--brand-border)] flex items-center justify-between">
            <span className="text-[12px] font-medium text-[var(--brand-ink)]">Composite Score</span>
            <span className="font-display text-[24px] font-bold text-[var(--brand-red)] num-tabular">{score.composite_score}</span>
          </div>
        </CardContent>
      </Card>

      {/* White space insight */}
      <Card className="card-premium border-l-4 border-l-[var(--brand-red)]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-[var(--brand-red)] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[12px] font-bold text-[var(--brand-ink)] uppercase tracking-wider mb-1.5">Insight & Recommendation</div>
              <div className="text-[12.5px] text-[var(--brand-ink)]/80 leading-relaxed">
                {score.white_space_summary}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographic + index grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <IndexCard label="Urban Index" value={kelurahan.urban_index} />
        <IndexCard label="Income Index" value={kelurahan.income_index} />
        <IndexCard label="Tourist Index" value={kelurahan.tourist_index} />
        <IndexCard label="Transport Index" value={kelurahan.transport_index} />
        <IndexCard label="POI Density" value={kelurahan.poi_density_index} />
        <IndexCard label="Mall Proximity" value={kelurahan.mall_proximity_index || Math.max(0, 100 - score.nearest_mall_distance_km * 20)} />
      </div>

      {/* Nearby stores / malls / POIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <NearbyCard
          title="Nearby MAP Stores (5km)"
          icon={StoreIcon}
          accent="red"
          count={nearby_stores.length}
        >
          {nearby_stores.slice(0, 10).map(s => (
            <div key={s.id} className="text-[11.5px] py-1.5 border-b border-[var(--brand-border)] last:border-0">
              <div className="flex items-center justify-between">
                <strong className="text-[var(--brand-ink)]">{s.brand_name}</strong>
                <span className="text-[var(--brand-red)] num-tabular text-[10px]">{s.distance_km.toFixed(1)}km</span>
              </div>
              <div className="text-[10px] text-[var(--brand-ink)]/55 truncate">
                {s.name} {s.is_in_mall ? `· ${s.mall_name}` : ''}
              </div>
            </div>
          ))}
          {nearby_stores.length === 0 && (
            <div className="text-[11px] text-[var(--brand-ink)]/50 py-2 text-center">
              Tidak ada toko MAP dalam 5km — first-mover opportunity
            </div>
          )}
        </NearbyCard>

        <NearbyCard
          title="Nearby Malls (10km)"
          icon={Building2}
          accent="ink"
          count={nearby_malls.length}
        >
          {nearby_malls.slice(0, 10).map(m => (
            <div key={m.id} className="text-[11.5px] py-1.5 border-b border-[var(--brand-border)] last:border-0">
              <div className="flex items-center justify-between">
                <strong className="text-[var(--brand-ink)]">{m.name}</strong>
                <span className="text-[var(--brand-red)] num-tabular text-[10px]">{m.distance_km.toFixed(1)}km</span>
              </div>
              <div className="text-[10px] text-[var(--brand-ink)]/55">
                {(m.gla_m2 / 1000).toFixed(0)}k m² · {m.class.replace('_', ' ')} · ~{m.visitor_estimate_daily.toLocaleString()}/day
              </div>
            </div>
          ))}
          {nearby_malls.length === 0 && (
            <div className="text-[11px] text-[var(--brand-ink)]/50 py-2 text-center">
              Tidak ada mall dalam 10km — street-location strategy
            </div>
          )}
        </NearbyCard>

        <NearbyCard
          title="Nearby POIs (10km)"
          icon={MapPin}
          accent="ink"
          count={nearby_pois.length}
        >
          {nearby_pois.slice(0, 10).map(p => (
            <div key={p.id} className="text-[11.5px] py-1.5 border-b border-[var(--brand-border)] last:border-0">
              <div className="flex items-center justify-between">
                <strong className="text-[var(--brand-ink)]">{p.name}</strong>
                <span className="text-[var(--brand-red)] num-tabular text-[10px]">{p.distance_km.toFixed(1)}km</span>
              </div>
              <div className="text-[10px] text-[var(--brand-ink)]/55 capitalize">
                {p.type.replace('_', ' ')} {p.magnitude > 0 ? `· ${p.magnitude.toLocaleString()}` : ''}
              </div>
            </div>
          ))}
          {nearby_pois.length === 0 && (
            <div className="text-[11px] text-[var(--brand-ink)]/50 py-2 text-center">Tidak ada POI dalam 10km</div>
          )}
        </NearbyCard>
      </div>

      {/* Risk assessment */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--brand-red)]" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 grid grid-cols-1 md:grid-cols-3 gap-3">
          <RiskItem
            label="Cannibalization Risk"
            value={score.cannibalization_risk}
            desc={`${score.nearby_existing_stores} MAP stores within 2km`}
          />
          <RiskItem
            label="Tier Saturation"
            value={kelurahan.tier === 1 ? 'high' : kelurahan.tier === 2 ? 'medium' : 'low'}
            desc={kelurahan.tier === 1 ? 'Tier-1 already saturated' : kelurahan.tier === 2 ? 'Moderate density' : 'Untapped market'}
          />
          <RiskItem
            label="Mall Dependency"
            value={score.nearest_mall_distance_km < 1.5 ? 'high' : score.nearest_mall_distance_km < 5 ? 'medium' : 'low'}
            desc={score.nearest_mall_name ? `Nearest: ${score.nearest_mall_name}` : 'No mall nearby'}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function BigStat({ label, value, suffix, icon: Icon, accent }: { label: string; value: string; suffix?: string; icon: any; accent?: 'red' }) {
  return (
    <div className="bg-white/5 rounded-md p-3 border border-white/10">
      <Icon className={`w-4 h-4 mb-1 ${accent === 'red' ? 'text-[var(--brand-red)]' : 'text-white/60'}`} />
      <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium">{label}</div>
      <div className="font-display text-[22px] font-bold leading-tight num-tabular">
        {value}<span className="text-[14px] text-white/60 ml-0.5">{suffix}</span>
      </div>
    </div>
  )
}

function IndexCard({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'var(--brand-red)' : value >= 50 ? '#D45F4A' : '#A08070'
  return (
    <Card className="card-premium">
      <CardContent className="p-3.5">
        <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/55 font-medium mb-1">{label}</div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="font-display text-[24px] font-bold num-tabular leading-none" style={{ color }}>{value}</span>
          <span className="text-[11px] text-[var(--brand-ink)]/40">/100</span>
        </div>
        <div className="h-1.5 bg-[var(--brand-cream)] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
        </div>
      </CardContent>
    </Card>
  )
}

function NearbyCard({ title, icon: Icon, accent, count, children }: { title: string; icon: any; accent: 'red' | 'ink'; count: number; children: React.ReactNode }) {
  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 ${accent === 'red' ? 'text-[var(--brand-red)]' : 'text-[var(--brand-ink)]'}`} />
            {title}
          </span>
          <span className="bg-[var(--brand-cream)] text-[var(--brand-ink)] px-1.5 py-0.5 rounded text-[10px] font-bold num-tabular">{count}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 max-h-72 overflow-y-auto scroll-styled">
        {children}
      </CardContent>
    </Card>
  )
}

function RiskItem({ label, value, desc }: { label: string; value: string; desc: string }) {
  const colors: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
  }
  return (
    <div className="bg-[var(--brand-cream)] rounded-md p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/55 font-medium mb-1">{label}</div>
      <span className={`text-[11px] px-2 py-0.5 rounded font-bold capitalize mb-1.5 inline-block ${colors[value] || colors.medium}`}>{value}</span>
      <div className="text-[11px] text-[var(--brand-ink)]/70">{desc}</div>
    </div>
  )
}
