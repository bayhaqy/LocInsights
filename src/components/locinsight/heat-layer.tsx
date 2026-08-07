'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

/**
 * Point-based heatmap layer using leaflet.heat.
 * Each point: [lat, lng, intensity 0..1]
 */
export interface HeatLayerProps {
  points: Array<[number, number, number]>
  radius?: number
  blur?: number
  maxZoom?: number
  minOpacity?: number
  gradient?: Record<number, string>
}

export function HeatLayer({
  points,
  radius = 25,
  blur = 18,
  maxZoom = 12,
  minOpacity = 0.15,
  gradient,
}: HeatLayerProps) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) return

    const opts: any = {
      radius,
      blur,
      maxZoom,
      minOpacity,
    }
    if (gradient) opts.gradient = gradient

    // @ts-ignore — leaflet.heat extends L.Layer but isn't typed
    const layer = (L as any).heatLayer(points, opts)

    layer.addTo(map)

    return () => {
      map.removeLayer(layer)
    }
  }, [map, points, radius, blur, maxZoom, minOpacity, gradient])

  return null
}
