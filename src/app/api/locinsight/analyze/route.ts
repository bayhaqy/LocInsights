import { NextRequest, NextResponse } from 'next/server'
import { scoreKelurahan, type ScoringConfig } from '@/lib/scoring/engine'
import { getKelurahan } from '@/lib/data/bali-kelurahan'
import { BALI_STORES } from '@/lib/data/bali-stores'
import { BALI_MALLS } from '@/lib/data/bali-malls'
import { BALI_POIS } from '@/lib/data/bali-poi'
import { haversineKm } from '@/lib/data/bali-kelurahan'

export const dynamic = 'force-dynamic'

/**
 * GET /api/locinsight/analyze?kelurahan_id=...&brand_id=...
 * Deep analysis of one kelurahan for one optional target brand.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const kelurahanId = sp.get('kelurahan_id')
  const brandId = sp.get('brand_id') || undefined

  if (!kelurahanId) {
    return NextResponse.json({ success: false, error: 'kelurahan_id is required' }, { status: 400 })
  }

  const kel = getKelurahan(kelurahanId)
  if (!kel) {
    return NextResponse.json({ success: false, error: 'kelurahan not found' }, { status: 404 })
  }

  const config: ScoringConfig = { brand_id: brandId }
  const score = scoreKelurahan(kel, config)

  // Nearby stores (within 5km)
  const nearbyStores = BALI_STORES
    .map(s => ({ ...s, distance_km: haversineKm(kel.lat, kel.lng, s.lat, s.lng) }))
    .filter(s => s.distance_km <= 5)
    .sort((a, b) => a.distance_km - b.distance_km)

  // Nearby malls (within 10km)
  const nearbyMalls = BALI_MALLS
    .map(m => ({ ...m, distance_km: haversineKm(kel.lat, kel.lng, m.lat, m.lng) }))
    .filter(m => m.distance_km <= 10)
    .sort((a, b) => a.distance_km - b.distance_km)

  // Nearby POIs (within 10km)
  const nearbyPOIs = BALI_POIS
    .map(p => ({ ...p, distance_km: haversineKm(kel.lat, kel.lng, p.lat, p.lng) }))
    .filter(p => p.distance_km <= 10)
    .sort((a, b) => a.distance_km - b.distance_km)

  return NextResponse.json({
    success: true,
    data: {
      kelurahan: kel,
      score,
      nearby_stores: nearbyStores,
      nearby_malls: nearbyMalls,
      nearby_pois: nearbyPOIs,
    },
  })
}
