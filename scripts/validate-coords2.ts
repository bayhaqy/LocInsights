/**
 * Detailed landmass check using Bali land polygon approximation
 */
import { BALI_KELURAHAN } from '../src/lib/data/bali-kelurahan'
import { KECAMATAN_LIST } from '../src/lib/data/bali-admin'

// Simplified Bali land polygon (counterclockwise)
// Source: simplified from GADM Bali province outline
const BALI_LAND: [number, number][] = [
  [-8.06, 114.46],  // NW corner (NW of Gilimanuk)
  [-8.10, 114.55],
  [-8.12, 114.70],
  [-8.15, 114.85],
  [-8.18, 115.00],
  [-8.20, 115.10],
  [-8.22, 115.18],
  [-8.25, 115.25],
  [-8.30, 115.32],
  [-8.35, 115.38],
  [-8.40, 115.42],
  [-8.45, 115.45],
  [-8.50, 115.48],
  [-8.55, 115.50],
  [-8.60, 115.52],
  [-8.65, 115.55],
  [-8.70, 115.55],
  [-8.74, 115.50],
  [-8.77, 115.45],
  [-8.80, 115.40],
  [-8.81, 115.30],
  [-8.81, 115.20],
  [-8.82, 115.10],
  [-8.80, 115.00],
  [-8.78, 114.90],
  [-8.75, 114.80],
  [-8.72, 114.70],
  [-8.68, 114.62],
  [-8.65, 114.55],
  [-8.60, 114.50],
  [-8.50, 114.45],
  [-8.30, 114.43],
  [-8.15, 114.44],
  [-8.06, 114.46],
]

function pointInPolygon(lat: number, lng: number, poly: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][1], yi = poly[i][0]
    const xj = poly[j][1], yj = poly[j][0]
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

console.log('=== KECAMATAN OUTSIDE LAND ===')
let badKec = 0
for (const k of KECAMATAN_LIST) {
  if (!pointInPolygon(k.lat, k.lng, BALI_LAND)) {
    console.log(`❌ ${k.code} ${k.name} (${k.lat}, ${k.lng})`)
    badKec++
  }
}
console.log(`Total bad kecamatan: ${badKec}/${KECAMATAN_LIST.length}`)

console.log('\n=== KELURAHAN OUTSIDE LAND ===')
let badKel = 0
const badList: string[] = []
for (const k of BALI_KELURAHAN) {
  if (!pointInPolygon(k.lat, k.lng, BALI_LAND)) {
    badList.push(`❌ ${k.id} ${k.name} (${k.kab_name}) → ${k.lat.toFixed(4)}, ${k.lng.toFixed(4)}`)
    badKel++
  }
}
badList.slice(0, 30).forEach(l => console.log(l))
console.log(`Total bad kelurahan: ${badKel}/${BALI_KELURAHAN.length}`)
