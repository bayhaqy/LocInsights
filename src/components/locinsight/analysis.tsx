'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Crosshair, TrendingUp, Store as StoreIcon, Building2, MapPin, AlertCircle,
  Activity, DollarSign, Users, Target, CheckCircle2, Info, Lightbulb,
  Shield, Clock, Brain, Navigation, HelpCircle, ArrowRight, Zap,
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
    score: OpportunityScore & { nearby_competitor_stores?: number; travel_time_min_to_nearest_mall?: number | null }
    nearby_stores: (Store & { distance_km: number })[]
    nearby_competitors?: any[]
    nearby_malls: (Mall & { distance_km: number })[]
    nearby_pois: (POI & { distance_km: number })[]
    isochrones?: { minutes: number; mode: string; points: { lat: number; lng: number }[] }[]
    ml_prediction?: {
      model_name: string
      predicted_revenue_juta: number
      confidence: number
      top_features: { feature: string; contribution: number }[]
    } | null
  }>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
            Location Deep Analysis
          </h2>
          <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
            Trade area, competition, isochrones, ML revenue prediction & actionable recommendation per kelurahan
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowHelp(s => !s)}>
          <HelpCircle className="w-4 h-4 mr-1" />
          {showHelp ? 'Hide Guide' : 'How to Use'}
        </Button>
      </div>

      {/* How to use guide */}
      {showHelp && (
        <Card className="card-premium bg-[var(--brand-cream)] border-l-4 border-l-[var(--brand-red)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-[var(--brand-red)] flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[13px] font-bold text-[var(--brand-ink)] mb-1">How to Use This Page</div>
                <div className="text-[11.5px] text-[var(--brand-ink)]/70 leading-relaxed">
                  This page gives you a complete site-selection analysis for any kelurahan in Bali. Use it to validate
                  expansion candidates identified in the Opportunities tab, or to do ad-hoc research.
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <GuideStep n={1} title="Pick a kelurahan" desc="Use the dropdown above — group by tier (Tier 1 = urban, Tier 3 = rural). Tier 1 = Denpasar/Badung, etc." />
              <GuideStep n={2} title="Optionally pick a target brand" desc="Filters the analysis for a specific MAP/MAA brand (e.g., Starbucks) — affects cannibalization + revenue projection." />
              <GuideStep n={3} title="Read the Composite Score" desc="0-100 weighted score across 6 factors. ≥70 = high_priority, 55-69 = priority, 40-54 = monitor, <40 = avoid." />
              <GuideStep n={4} title="Check the Recommendation Action" desc="The blue 'Recommended Action' card tells you exactly what to do next: open store / wait / avoid / survey further." />
              <GuideStep n={5} title="Review competition" desc="Nearby MAP stores + competitor outlets (Indomaret, MCD, etc.) within 5km. Higher competitor density = lower competition score." />
              <GuideStep n={6} title="Use travel-time isochrones" desc="5/10/15-min motorbike reach polygon — realistic catchment area accounting for road network friction." />
              <GuideStep n={7} title="Compare heuristic vs ML revenue" desc="Phase 3 GBR model predicts revenue from features. Disagreement with heuristic = signal to investigate." />
              <GuideStep n={8} title="Export via Reports tab" desc="When ready, use the Reports tab to generate PDF/CSV for stakeholder presentation." />
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="text-[11px] text-[var(--brand-ink)]/40 mt-1">
              Tip: Klik "How to Use" untuk panduan singkat
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

function GuideStep({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 bg-white p-2.5 rounded">
      <div className="w-5 h-5 rounded-full bg-[var(--brand-red)] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
        {n}
      </div>
      <div>
        <div className="text-[12px] font-bold text-[var(--brand-ink)]">{title}</div>
        <div className="text-[10.5px] text-[var(--brand-ink)]/70 leading-snug">{desc}</div>
      </div>
    </div>
  )
}

function AnalysisView({ data }: { data: any }) {
  const { kelurahan, score, nearby_stores, nearby_competitors, nearby_malls, nearby_pois, isochrones, ml_prediction } = data

  // Compute recommended action
  const recommendedAction = computeRecommendedAction(score, kelurahan, nearby_stores, nearby_competitors || [])

  return (
    <div className="space-y-4">
      {/* Header summary card */}
      <Card className="bg-[var(--brand-ink)] text-white border-0 rounded-xl shadow-sm">
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

      {/* Recommended Action — NEW */}
      <Card className={`card-premium border-l-4 ${recommendedAction.color === 'green' ? 'border-l-green-500' : recommendedAction.color === 'red' ? 'border-l-red-500' : recommendedAction.color === 'amber' ? 'border-l-amber-500' : 'border-l-[var(--brand-red)]'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${recommendedAction.color === 'green' ? 'bg-green-100' : recommendedAction.color === 'red' ? 'bg-red-100' : recommendedAction.color === 'amber' ? 'bg-amber-100' : 'bg-[var(--brand-red-light)]'}`}>
              <ArrowRight className={`w-4 h-4 ${recommendedAction.color === 'green' ? 'text-green-600' : recommendedAction.color === 'red' ? 'text-red-600' : recommendedAction.color === 'amber' ? 'text-amber-600' : 'text-[var(--brand-red)]'}`} />
            </div>
            <div className="flex-1">
              <div className="text-[12px] font-bold text-[var(--brand-ink)] uppercase tracking-wider mb-1.5">
                Recommended Action: {recommendedAction.title}
              </div>
              <div className="text-[12.5px] text-[var(--brand-ink)]/85 leading-relaxed mb-2">
                {recommendedAction.description}
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendedAction.nextSteps.map((step: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{step}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ML Prediction (Phase 3) — NEW */}
      {ml_prediction && (
        <Card className="card-premium border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] font-bold text-[var(--brand-ink)] uppercase tracking-wider">
                    ML Revenue Prediction (Phase 3 — GBR)
                  </div>
                  <Badge variant="outline" className="text-[9px]">{(ml_prediction.confidence * 100).toFixed(0)}% confidence</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/55">ML Predicted</div>
                    <div className="text-[20px] font-bold text-purple-700">{ml_prediction.predicted_revenue_juta} jt</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/55">Heuristic</div>
                    <div className="text-[20px] font-bold text-[var(--brand-ink)]">{score.projected_monthly_revenue_juta} jt</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/55">Delta</div>
                    <div className={`text-[20px] font-bold ${ml_prediction.predicted_revenue_juta > score.projected_monthly_revenue_juta ? 'text-green-600' : 'text-amber-600'}`}>
                      {ml_prediction.predicted_revenue_juta > score.projected_monthly_revenue_juta ? '+' : ''}
                      {ml_prediction.predicted_revenue_juta - score.projected_monthly_revenue_juta} jt
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/55">Model</div>
                    <div className="text-[12px] font-mono text-[var(--brand-ink)]/70">{ml_prediction.model_name}</div>
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/55 mb-1">Top Driving Features (SHAP-style)</div>
                <div className="flex flex-wrap gap-1">
                  {ml_prediction.top_features.map((f: any, i: number) => (
                    <span key={i} className="text-[10px] bg-[var(--brand-cream)] px-1.5 py-0.5 rounded">
                      {f.feature}: <strong>{f.contribution > 0 ? '+' : ''}{f.contribution}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Travel-time isochrones (Phase 2) — NEW */}
      {isochrones && isochrones.length > 0 && (
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
              <Navigation className="w-4 h-4 text-[var(--brand-red)]" />
              Travel-Time Isochrones (Phase 2 — friction-based)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {isochrones.map((iso, i) => {
                const area = computePolygonAreaKm2(iso.points)
                return (
                  <div key={i} className="bg-[var(--brand-cream)] p-3 rounded-md">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">{iso.minutes} min by {iso.mode}</span>
                    </div>
                    <div className="font-display text-[24px] font-bold text-[var(--brand-ink)] num-tabular">{area.toFixed(1)}<span className="text-[12px] text-[var(--brand-ink)]/60 ml-1">km²</span></div>
                    <div className="text-[10px] text-[var(--brand-ink)]/55 mt-1">Reachable catchment area</div>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 text-[10.5px] text-[var(--brand-ink)]/60 leading-relaxed">
              Approximation: Haversine × road friction factor (Tier {kelurahan.tier === 1 ? '1.3×' : kelurahan.tier === 2 ? '1.55×' : '1.8×'}),
              aligned to Bali road network (NNW-SSE axis).
              Production can swap to OSRM/Valhalla isochrones for true road-network accuracy.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Factor breakdown */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--brand-red)]" />
            Composite Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {score.factors.map((f: any) => (
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

      {/* Nearby stores / competitors / malls / POIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <NearbyCard
          title="Nearby MAP Stores (5km)"
          icon={StoreIcon}
          accent="red"
          count={nearby_stores.length}
        >
          {nearby_stores.slice(0, 10).map((s: any) => (
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
          title="Nearby Competitors (5km)"
          icon={Shield}
          accent="amber"
          count={nearby_competitors?.length || 0}
        >
          {(nearby_competitors || []).slice(0, 10).map((c: any, i: number) => (
            <div key={i} className="text-[11.5px] py-1.5 border-b border-[var(--brand-border)] last:border-0">
              <div className="flex items-center justify-between">
                <strong className="text-[var(--brand-ink)]">{c.brand_name}</strong>
                <span className="text-amber-600 num-tabular text-[10px]">{c.distance_km.toFixed(1)}km</span>
              </div>
              <div className="text-[10px] text-[var(--brand-ink)]/55 truncate">{c.name}</div>
            </div>
          ))}
          {(!nearby_competitors || nearby_competitors.length === 0) && (
            <div className="text-[11px] text-[var(--brand-ink)]/50 py-2 text-center">
              No competitors in DB for this area. Use Competitor Intel tab to scrape.
            </div>
          )}
        </NearbyCard>

        <NearbyCard
          title="Nearby Malls (10km)"
          icon={Building2}
          accent="ink"
          count={nearby_malls.length}
        >
          {nearby_malls.slice(0, 10).map((m: any) => (
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
          {nearby_pois.slice(0, 10).map((p: any) => (
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
            desc={`${score.nearby_existing_stores} MAP stores within 2km${score.nearby_competitor_stores ? ` + ${score.nearby_competitor_stores} competitors` : ''}`}
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

function computeRecommendedAction(score: any, kelurahan: any, nearbyStores: any[], nearbyCompetitors: any[]) {
  const composite = score.composite_score
  const cannibalization = score.cannibalization_risk
  const competitorDensity = nearbyCompetitors.length

  if (composite >= 70 && cannibalization !== 'high') {
    return {
      title: 'PROCEED — Open Store',
      color: 'green',
      description: `Strong composite score (${composite}/100) with ${cannibalization} cannibalization risk. This kelurahan is a high-priority expansion candidate. Initiate site survey and lease negotiation.`,
      nextSteps: ['Schedule field visit', 'Check lease availability', 'Run brand-specific Huff model', 'Prepare business case'],
    }
  }
  if (composite >= 55 && cannibalization !== 'high') {
    return {
      title: 'PRIORITY — Detailed Feasibility',
      color: 'red',
      description: `Favorable composite score (${composite}/100). Proceed with detailed feasibility: foot-traffic survey, lease-cost analysis, and brand-specific revenue projection.`,
      nextSteps: ['Foot-traffic survey (PWA)', 'Lease cost benchmarking', 'Brand-specific scenario analysis'],
    }
  }
  if (composite >= 40) {
    return {
      title: 'MONITOR — Wait for Market Maturity',
      color: 'amber',
      description: `Moderate score (${composite}/100). Market not yet ready for expansion. Re-evaluate quarterly as population density and infrastructure mature.`,
      nextSteps: ['Add to watchlist', 'Quarterly re-scoring', 'Monitor competitor movements'],
    }
  }
  return {
    title: 'AVOID — Not Viable Now',
    color: 'red',
    description: `Low composite score (${composite}/100). Insufficient market potential, accessibility, or foot traffic. Do not invest in this location.`,
    nextSteps: ['Skip this site', 'Focus on Tier 1-2 candidates'],
  }
}

function computePolygonAreaKm2(points: { lat: number; lng: number }[]): number {
  // Shoelace formula on lat/lng → approximate km²
  if (points.length < 3) return 0
  let area = 0
  const R = 6371 // Earth radius km
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    area += (p2.lng - p1.lng) * (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180))
  }
  area = Math.abs(area * R * R / 2) * (Math.PI / 180)
  return area
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

function NearbyCard({ title, icon: Icon, accent, count, children }: { title: string; icon: any; accent: 'red' | 'ink' | 'amber'; count: number; children: React.ReactNode }) {
  const iconColor = accent === 'red' ? 'text-[var(--brand-red)]' : accent === 'amber' ? 'text-amber-600' : 'text-[var(--brand-ink)]'
  return (
    <Card className="card-premium">
      <CardHeader className="pb-2">
        <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
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
