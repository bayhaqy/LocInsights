'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  LayerGroup,
  ZoomControl,
  Tooltip,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import type { OpportunityScore, Store, Mall, POI } from './types'
import { HeatLayer } from './heat-layer'
import { ChoroplethLayer } from './choropleth-layer'

// Fix default icon path issue with Next.js + Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom divIcon for category-coded markers
function brandMarker(category: string, parent: 'MAP' | 'MAA'): L.DivIcon {
  const colors: Record<string, string> = {
    food_beverage: '#C8102E',
    sports: '#0F0F12',
    fashion: '#9B0E24',
    department_store: '#5C5C5C',
    kids: '#D45F4A',
    lifestyle: '#A33A2A',
    beauty: '#B71C3A',
  }
  const color = colors[category] || '#666'
  const letter = parent === 'MAA' ? 'A' : 'M'
  return L.divIcon({
    className: 'li-marker',
    html: `<div class="li-marker-pin" style="background:${color}"><span>${letter}</span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -22],
  })
}

function mallMarker(): L.DivIcon {
  return L.divIcon({
    className: 'li-marker',
    html: `<div class="li-marker-pin" style="background:#0F0F12;width:28px;height:28px;border:3px solid #C8102E"><span style="color:#fff">M</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -24],
  })
}

function poiMarker(type: string): L.DivIcon {
  const colors: Record<string, string> = {
    tourist_attraction: '#D45F4A',
    beach: '#3D7EA6',
    temple: '#8B5A2B',
    hotel_cluster: '#7B6F4E',
    transit_hub: '#2A2A2A',
    university: '#5C5C5C',
    hospital: '#B71C3A',
    office_cluster: '#4A4A4A',
    port: '#3D7EA6',
  }
  const color = colors[type] || '#666'
  return L.divIcon({
    className: 'li-marker',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  })
}

// Component to fly to a location
function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.2 })
  }, [lat, lng, zoom, map])
  return null
}

export interface CompetitorPin {
  id: string
  brand_name: string
  brand_category?: string
  name: string
  lat: number
  lng: number
  kec?: string
  kab?: string
  is_in_mall?: boolean
  mall_name?: string | null
  source?: string
}

export interface LocInsightMapProps {
  opportunities: OpportunityScore[]
  stores: Store[]
  malls: Mall[]
  pois: POI[]
  selectedKelurahanId: string | null
  onSelectKelurahan: (id: string) => void
  showStores: boolean
  showMalls: boolean
  showPOIs: boolean
  showHeat: boolean
  /** 'region' = choropleth (real GADM polygons); 'point' = leaflet.heat intensity */
  heatMode?: 'region' | 'point'
  /** Choropleth granularity — kabupaten (9) or kecamatan (59) */
  heatGranularity?: 'kabupaten' | 'kecamatan'
  /** Choropleth metric (only used when heatMode='region') */
  heatMetric?: 'avg_score' | 'max_score' | 'high_priority_count' | 'store_density'
  tierFilter: 1 | 2 | 3 | 'all'
  recommendationFilter: 'all' | 'high_priority' | 'priority' | 'monitor' | 'avoid'
  /** Advanced layers (Phase 4) */
  showCompetitors?: boolean
  showTouristPOIs?: boolean
  showIncomeHeat?: boolean
  showCrowdDensity?: boolean
  competitors?: CompetitorPin[]
  competitorBrandFilter?: string
  /** Kelurahan-level points with income_index for income heatmap */
  kelurahanPoints?: Array<{ lat: number; lng: number; income_index: number; name: string; kab: string }>
  height?: string
}

export function LocInsightMap({
  opportunities,
  stores,
  malls,
  pois,
  selectedKelurahanId,
  onSelectKelurahan,
  showStores,
  showMalls,
  showPOIs,
  showHeat,
  heatMode = 'region',
  heatGranularity = 'kabupaten',
  heatMetric = 'avg_score',
  tierFilter,
  recommendationFilter,
  showCompetitors = false,
  showTouristPOIs = false,
  showIncomeHeat = false,
  showCrowdDensity = false,
  competitors = [],
  competitorBrandFilter = 'all',
  kelurahanPoints = [],
  height = '600px',
}: LocInsightMapProps) {
  const [mapReady, setMapReady] = useState(false)
  const selected = opportunities.find(o => o.kelurahan_id === selectedKelurahanId)

  // Bali center: roughly -8.4, 115.2
  const center: [number, number] = [-8.45, 115.2]
  const initialZoom = 10

  const filteredOpps = useMemo(() => {
    return opportunities.filter(o => {
      if (tierFilter !== 'all' && o.tier !== tierFilter) return false
      if (recommendationFilter !== 'all' && o.recommendation !== recommendationFilter) return false
      return true
    })
  }, [opportunities, tierFilter, recommendationFilter])

  const filteredStores = useMemo(() => {
    if (!showStores) return []
    return stores.filter(s => {
      if (tierFilter === 'all') return true
      // Map kabupaten to tier
      const kabTier: Record<string, number> = {
        Badung: 1, Denpasar: 1,
        Tabanan: 2, Gianyar: 2, Buleleng: 2,
        Jembrana: 3, Klungkung: 3, Bangli: 3, Karangasem: 3,
      }
      return kabTier[s.kab] === tierFilter
    })
  }, [stores, showStores, tierFilter])

  // Memoize heat points so HeatLayer's useEffect doesn't tear down + recreate the
  // canvas on every parent render (was the root cause of "heatmap not visible").
  const heatPoints = useMemo(
    () => filteredOpps.map(o => [o.lat, o.lng, o.composite_score / 100] as [number, number, number]),
    [filteredOpps]
  )

  // Competitor markers (filtered by brand if a filter is set)
  const filteredCompetitors = useMemo(() => {
    if (!showCompetitors) return []
    if (competitorBrandFilter === 'all') return competitors
    return competitors.filter(c => c.brand_name === competitorBrandFilter)
  }, [competitors, showCompetitors, competitorBrandFilter])

  // Tourist POIs: filter pois to tourist-related types
  const touristPOIs = useMemo(() => {
    if (!showTouristPOIs) return []
    const touristTypes = ['tourist_attraction', 'beach', 'temple', 'hotel_cluster', 'university']
    return pois.filter(p => touristTypes.includes(p.type))
  }, [pois, showTouristPOIs])

  // Crowd density heat points: combine POIs + malls + stores + competitors
  const crowdPoints = useMemo(() => {
    if (!showCrowdDensity) return []
    const pts: Array<[number, number, number]> = []
    pois.forEach(p => pts.push([p.lat, p.lng, 0.3]))
    malls.forEach(m => pts.push([m.lat, m.lng, 0.8]))
    stores.forEach(s => pts.push([s.lat, s.lng, 0.5]))
    competitors.forEach(c => pts.push([c.lat, c.lng, 0.4]))
    return pts
  }, [pois, malls, stores, competitors, showCrowdDensity])

  // Income color scale: 0-100 income_index → green (low) to dark green (high)
  function incomeColor(idx: number): string {
    if (idx >= 80) return '#065f46' // dark green
    if (idx >= 70) return '#10b981' // emerald
    if (idx >= 60) return '#34d399' // light green
    if (idx >= 50) return '#fbbf24' // yellow
    if (idx >= 40) return '#f97316' // orange
    return '#dc2626' // red
  }

  return (
    <div style={{ height, width: '100%' }} className="relative rounded-lg overflow-hidden border border-[var(--brand-border)]">
      <MapContainer
        center={center}
        zoom={initialZoom}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />

        {selected && <FlyTo lat={selected.lat} lng={selected.lng} zoom={13} />}

        {/* Regional choropleth heatmap (per kabupaten OR kecamatan) — uses real GADM boundaries */}
        {showHeat && heatMode === 'region' && (
          <ChoroplethLayer
            opportunities={filteredOpps}
            metric={heatMetric}
            granularity={heatGranularity}
            showLabels
            activeTier={tierFilter}
          />
        )}

        {/* Point-based heatmap (leaflet.heat) — per kelurahan */}
        {showHeat && heatMode === 'point' && (
          <HeatLayer
            points={heatPoints}
            radius={32}
            blur={28}
            maxZoom={11}
            minOpacity={0.4}
            max={0.6}
          />
        )}

        {/* Opportunity markers */}
        <LayerGroup>
          {filteredOpps.map(o => {
            const isSelected = o.kelurahan_id === selectedKelurahanId
            const color =
              o.recommendation === 'high_priority' ? '#C8102E' :
              o.recommendation === 'priority' ? '#D45F4A' :
              o.recommendation === 'monitor' ? '#A08070' :
              '#B0B0B0'
            const radius = isSelected ? 14 : 6 + Math.round(o.composite_score / 12)
            return (
              <CircleMarker
                key={o.kelurahan_id}
                center={[o.lat, o.lng]}
                radius={radius}
                pathOptions={{
                  color: isSelected ? '#0F0F12' : color,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.95 : 0.6,
                  weight: isSelected ? 3 : 1,
                }}
                eventHandlers={{
                  click: () => onSelectKelurahan(o.kelurahan_id),
                }}
              >
                <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                  <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
                    <strong>{o.kelurahan_name}</strong><br />
                    {o.kec_name}, {o.kab_name}<br />
                    Score: <strong style={{ color: '#C8102E' }}>{o.composite_score}</strong> · {o.recommendation.replace('_', ' ')}
                  </div>
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 220 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{o.kelurahan_name}</div>
                    <div style={{ color: '#666', fontSize: 11, marginBottom: 8 }}>
                      {o.kec_name} · {o.kab_name} · Tier {o.tier}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>Composite Score</span>
                      <strong style={{ color: '#C8102E' }}>{o.composite_score}/100</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>Est. Daily Customers</span>
                      <strong>{o.estimated_daily_customers}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>Proj. Monthly Rev.</span>
                      <strong>Rp {o.projected_monthly_revenue_juta} jt</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                      <span>Market Share</span>
                      <strong>{(o.potential_market_share * 100).toFixed(1)}%</strong>
                    </div>
                    <div style={{ fontSize: 11, color: '#666', borderTop: '1px solid #eee', paddingTop: 8 }}>
                      {o.nearest_mall_name ? `Nearest mall: ${o.nearest_mall_name} (${o.nearest_mall_distance_km}km)` : 'No mall nearby'}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </LayerGroup>

        {/* Mall markers */}
        {showMalls && malls.filter(m => m.visitor_estimate_daily > 0).map(m => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={mallMarker()}>
            <Tooltip direction="top" offset={[0, -25]} opacity={1}>
              <div style={{ fontSize: '11px' }}>
                <strong>{m.name}</strong><br />
                {m.kec}, {m.kab}<br />
                GLA: {(m.gla_m2 / 1000).toFixed(0)}k m² · {m.class.replace('_', ' ')}
              </div>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{m.name}</div>
                <div style={{ color: '#666', fontSize: 11, marginBottom: 8 }}>{m.kec}, {m.kab}</div>
                <div style={{ fontSize: 12, marginBottom: 2 }}>Opened: <strong>{m.opened_year}</strong></div>
                <div style={{ fontSize: 12, marginBottom: 2 }}>GLA: <strong>{(m.gla_m2 / 1000).toFixed(1)}k m²</strong></div>
                <div style={{ fontSize: 12, marginBottom: 2 }}>Class: <strong>{m.class.replace('_', ' ')}</strong></div>
                <div style={{ fontSize: 12, marginBottom: 2 }}>Est. daily visitors: <strong>{m.visitor_estimate_daily.toLocaleString()}</strong></div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Store markers */}
        {filteredStores.map(s => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={brandMarker(s.brand_category, s.parent)}
          >
            <Tooltip direction="top" offset={[0, -22]} opacity={1}>
              <div style={{ fontSize: '11px' }}>
                <strong>{s.brand_name}</strong><br />
                {s.name}<br />
                {s.is_in_mall ? `📍 ${s.mall_name}` : s.address}
              </div>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#C8102E' }}>{s.brand_name}</div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                  {s.is_in_mall ? `📍 ${s.mall_name}` : s.address}<br />
                  {s.kec}, {s.kab}
                </div>
                <div style={{ fontSize: 11, display: 'grid', gridTemplateColumns: '1fr auto', gap: 4 }}>
                  <span>Category:</span><strong>{s.brand_category.replace('_', ' ')}</strong>
                  <span>Parent:</span><strong>{s.parent === 'MAA' ? 'MAP Active' : 'MAP'}</strong>
                  <span>Opened:</span><strong>{s.opened_year}</strong>
                  <span>In Mall:</span><strong>{s.is_in_mall ? 'Yes' : 'No'}</strong>
                  <span>Verified:</span><strong>{s.confirmed ? 'Yes' : 'Est.'}</strong>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* POI markers */}
        {showPOIs && pois.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={poiMarker(p.type)}>
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div style={{ fontSize: '11px' }}>
                <strong>{p.name}</strong><br />
                {p.type.replace('_', ' ')}
              </div>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{p.type.replace('_', ' ')} · {p.kec}, {p.kab}</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>{p.notes}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ====== Advanced Layers (Phase 4) ====== */}

        {/* Competitor store markers (red shields) */}
        {showCompetitors && filteredCompetitors.map(c => (
          <CircleMarker
            key={`comp-${c.id}`}
            center={[c.lat, c.lng]}
            radius={4}
            pathOptions={{
              color: '#dc2626',
              fillColor: '#dc2626',
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -5]} opacity={1}>
              <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
                <strong>{c.brand_name}</strong><br />
                {c.name}<br />
                {c.kec ? `${c.kec}, ` : ''}{c.kab || ''}
              </div>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: '#dc2626' }}>{c.brand_name}</div>
                <div style={{ fontSize: 12, marginBottom: 6 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
                  {c.is_in_mall ? `📍 ${c.mall_name || 'In Mall'}` : (c.kec ? `${c.kec}, ` : '') + (c.kab || '')}
                </div>
                <div style={{ fontSize: 11, display: 'grid', gridTemplateColumns: '1fr auto', gap: 3 }}>
                  <span>Category:</span><strong>{(c.brand_category || 'other').replace('_', ' ')}</strong>
                  <span>Source:</span><strong>{c.source || '—'}</strong>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Tourist attraction markers (cyan) */}
        {showTouristPOIs && touristPOIs.map(p => (
          <CircleMarker
            key={`tourist-${p.id}`}
            center={[p.lat, p.lng]}
            radius={5}
            pathOptions={{
              color: '#0891b2',
              fillColor: '#0891b2',
              fillOpacity: 0.7,
              weight: 1.5,
            }}
          >
            <Tooltip direction="top" offset={[0, -5]} opacity={1}>
              <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
                <strong>{p.name}</strong><br />
                {p.type.replace('_', ' ')} · {p.kab}
              </div>
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0891b2' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{p.type.replace('_', ' ')} · {p.kec}, {p.kab}</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>{p.notes}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Income heatmap — circle markers colored by income_index per kelurahan */}
        {showIncomeHeat && kelurahanPoints.map((k, i) => (
          <CircleMarker
            key={`inc-${i}`}
            center={[k.lat, k.lng]}
            radius={8}
            pathOptions={{
              color: incomeColor(k.income_index),
              fillColor: incomeColor(k.income_index),
              fillOpacity: 0.6,
              weight: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -5]} opacity={1}>
              <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
                <strong>{k.name}</strong><br />
                Income Index: <strong style={{ color: incomeColor(k.income_index) }}>{k.income_index}</strong><br />
                {k.kab}
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Crowd density heatmap (leaflet.heat) */}
        {showCrowdDensity && crowdPoints.length > 0 && (
          <HeatLayer
            points={crowdPoints}
            radius={25}
            blur={20}
            maxZoom={12}
            minOpacity={0.3}
            max={0.8}
            gradient={{
              0.0: '#fef3c7',
              0.2: '#fde68a',
              0.4: '#fb923c',
              0.6: '#ef4444',
              0.8: '#b91c1c',
              1.0: '#7f1d1d',
            }}
          />
        )}
      </MapContainer>

      {/* Map legend overlay */}
      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg border border-[var(--brand-border)] shadow-sm p-3 text-xs space-y-2 z-[1000]">
        <div className="font-semibold text-[11px] uppercase tracking-wider text-[var(--brand-ink)]">Opportunity</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#C8102E' }}></span>High priority (≥70)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#D45F4A' }}></span>Priority (55–69)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#A08070' }}></span>Monitor (40–54)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#B0B0B0' }}></span>Avoid (&lt;40)</div>
        {showMalls && <div className="flex items-center gap-2 pt-1 border-t border-[var(--brand-border)]"><span className="w-3 h-3 rounded-full" style={{ background: '#0F0F12', border: '2px solid #C8102E' }}></span>Mall</div>}
        {showStores && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#C8102E' }}></span>MAP Store · <span style={{ background: '#0F0F12' }} className="w-3 h-3 rounded-full inline-block"></span>MAA Store</div>}
        {showCompetitors && <div className="flex items-center gap-2 pt-1 border-t border-[var(--brand-border)]"><span className="w-3 h-3 rounded-full" style={{ background: '#dc2626' }}></span>Competitor Store</div>}
        {showTouristPOIs && <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: '#0891b2' }}></span>Tourist Attraction</div>}
        {showIncomeHeat && (
          <div className="pt-1 border-t border-[var(--brand-border)]">
            <div className="font-semibold text-[10px] uppercase tracking-wider mb-1">Income Index</div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: '#dc2626' }}></span>＜40
              <span className="w-3 h-3 rounded-full" style={{ background: '#f97316' }}></span>40-49
              <span className="w-3 h-3 rounded-full" style={{ background: '#fbbf24' }}></span>50-59
              <span className="w-3 h-3 rounded-full" style={{ background: '#34d399' }}></span>60-69
              <span className="w-3 h-3 rounded-full" style={{ background: '#10b981' }}></span>70-79
              <span className="w-3 h-3 rounded-full" style={{ background: '#065f46' }}></span>≥80
            </div>
          </div>
        )}
        {showCrowdDensity && <div className="flex items-center gap-2 pt-1 border-t border-[var(--brand-border)]"><span className="w-3 h-3 rounded-full" style={{ background: '#fb923c' }}></span>Crowd Density (heat)</div>}
      </div>

      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[1100]">
          <div className="text-sm text-[var(--brand-ink)]">Loading map…</div>
        </div>
      )}
    </div>
  )
}
