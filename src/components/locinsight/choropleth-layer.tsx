'use client'

import { useEffect, useMemo } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { KABUPATEN_POLYGONS } from '@/lib/data/bali-kabupaten-polygons'
import type { OpportunityScore } from './types'

export interface ChoroplethLayerProps {
  opportunities: OpportunityScore[]
  /** Score aggregation: 'avg' | 'max' | 'count' (count of high_priority) */
  metric: 'avg_score' | 'max_score' | 'high_priority_count' | 'store_density'
  /** Show labels on each kabupaten */
  showLabels?: boolean
  /** Filter to a specific tier (1/2/3) — others shown faded */
  activeTier?: 1 | 2 | 3 | 'all'
  /** Called when user clicks a kabupaten */
  onSelectKabupaten?: (code: string) => void
}

function scoreColor(score: number): string {
  // 0-100 → red gradient (low=light, high=dark red)
  if (score >= 70) return '#7A0A1A'   // deep red
  if (score >= 60) return '#A30F23'   // strong red
  if (score >= 50) return '#C8102E'   // brand red
  if (score >= 40) return '#D45F4A'   // terracotta
  if (score >= 30) return '#E8917A'   // soft red
  return '#F3D0C5'                     // very light
}

function countColor(count: number): string {
  if (count >= 8) return '#7A0A1A'
  if (count >= 5) return '#A30F23'
  if (count >= 3) return '#C8102E'
  if (count >= 2) return '#D45F4A'
  if (count >= 1) return '#E8917A'
  return '#F3D0C5'
}

export function ChoroplethLayer({
  opportunities,
  metric,
  showLabels = true,
  activeTier = 'all',
  onSelectKabupaten,
}: ChoroplethLayerProps) {
  const map = useMap()

  // Aggregate opportunities per kabupaten
  const perKab = useMemo(() => {
    const map = new Map<string, { sum: number; max: number; count: number; hpCount: number; tier: number }>()
    for (const o of opportunities) {
      const k = map.get(o.kab_name) || { sum: 0, max: 0, count: 0, hpCount: 0, tier: o.tier }
      k.sum += o.composite_score
      k.max = Math.max(k.max, o.composite_score)
      k.count += 1
      if (o.recommendation === 'high_priority') k.hpCount += 1
      map.set(o.kab_name, k)
    }
    return map
  }, [opportunities])

  useEffect(() => {
    const layers: L.Layer[] = []

    for (const poly of KABUPATEN_POLYGONS) {
      // Match polygon to aggregated stats by name
      // For 'Nusa Penida' use parent Klungkung stats
      const lookupName = poly.name === 'Nusa Penida' ? 'Klungkung' : poly.name
      const stats = perKab.get(lookupName)

      let value = 0
      let fillColor = '#F3D0C5'
      let displayValue = '—'

      if (stats) {
        switch (metric) {
          case 'avg_score':
            value = stats.sum / stats.count
            fillColor = scoreColor(value)
            displayValue = value.toFixed(1)
            break
          case 'max_score':
            value = stats.max
            fillColor = scoreColor(value)
            displayValue = value.toFixed(0)
            break
          case 'high_priority_count':
            value = stats.hpCount
            fillColor = countColor(value)
            displayValue = value.toString()
            break
          case 'store_density':
            // Use existing stores density as proxy
            value = stats.count
            fillColor = countColor(value)
            displayValue = value.toString()
            break
        }
      }

      const isActive = activeTier === 'all' || poly.tier === activeTier
      const fillOpacity = isActive ? 0.55 : 0.15
      const weight = isActive ? 1.5 : 0.8

      const latlngs: L.LatLngExpression[] = poly.polygon.map(([lat, lng]) => [lat, lng] as [number, number])

      const polygon = L.polygon(latlngs, {
        color: '#0F0F12',
        weight,
        opacity: 0.4,
        fillColor,
        fillOpacity,
      })

      polygon.bindTooltip(
        `<div style="font-size:11px;line-height:1.4">
          <strong>${poly.name}</strong><br/>
          Tier ${poly.tier}<br/>
          ${metric === 'avg_score' ? 'Avg Score' :
            metric === 'max_score' ? 'Max Score' :
            metric === 'high_priority_count' ? 'High-Priority Sites' :
            'Kelurahan Count'}: <strong style="color:#C8102E">${displayValue}</strong>
        </div>`,
        { sticky: true, direction: 'top' }
      )

      if (onSelectKabupaten) {
        polygon.on('click', () => onSelectKabupaten(poly.code))
      }

      polygon.addTo(map)
      layers.push(polygon)

      // Add label
      if (showLabels && isActive) {
        const centroid = poly.polygon.reduce(
          (acc, [lat, lng]) => [acc[0] + lat / poly.polygon.length, acc[1] + lng / poly.polygon.length],
          [0, 0]
        )
        const label = L.marker(centroid as L.LatLngExpression, {
          icon: L.divIcon({
            className: 'kab-label',
            html: `<div style="font-family:Inter,sans-serif;font-size:10px;font-weight:600;color:#0F0F12;background:rgba(255,255,255,0.85);padding:1px 5px;border-radius:3px;border:1px solid rgba(0,0,0,0.1);white-space:nowrap;text-align:center">
              <div>${poly.name}</div>
              <div style="color:#C8102E;font-weight:700">${displayValue}</div>
            </div>`,
            iconSize: [80, 28],
            iconAnchor: [40, 14],
          }),
          interactive: false,
        })
        label.addTo(map)
        layers.push(label)
      }
    }

    return () => {
      layers.forEach(l => map.removeLayer(l))
    }
  }, [map, perKab, metric, showLabels, activeTier, onSelectKabupaten])

  return null
}
