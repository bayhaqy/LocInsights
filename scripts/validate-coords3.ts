/**
 * Use a more detailed Bali land polygon
 */
import { BALI_KELURAHAN } from '../src/lib/data/bali-kelurahan'
import { KECAMATAN_LIST } from '../src/lib/data/bali-admin'
import { BALI_MALLS } from '../src/lib/data/bali-malls'
import { BALI_STORES } from '../src/lib/data/bali-stores'
import { BALI_POIS } from '../src/lib/data/bali-poi'

// More detailed Bali polygon (counterclockwise, lat,lng)
// Captures Bukit peninsula, eastern Karangasem, northern Buleleng coast
const BALI_LAND: [number, number][] = [
  // NW corner - Gilimanuk area
  [-8.075, 114.43],
  [-8.09, 114.48],
  [-8.10, 114.55],
  [-8.11, 114.62],
  // North coast west to east (Buleleng)
  [-8.11, 114.70],
  [-8.10, 114.80],
  [-8.08, 114.90],
  [-8.06, 115.00],
  [-8.07, 115.08],
  [-8.09, 115.12],
  [-8.11, 115.15],
  [-8.13, 115.18],
  [-8.16, 115.20],
  [-8.18, 115.22],
  [-8.20, 115.25],
  [-8.22, 115.28],
  [-8.23, 115.32],
  [-8.22, 115.36],
  [-8.20, 115.40],
  [-8.18, 115.45],
  // East coast - Karangasem
  [-8.20, 115.50],
  [-8.23, 115.55],
  [-8.27, 115.60],
  [-8.30, 115.65],
  [-8.33, 115.69],
  [-8.36, 115.70],
  [-8.40, 115.69],
  [-8.43, 115.66],
  [-8.45, 115.62],
  [-8.47, 115.58],
  [-8.50, 115.55],
  [-8.53, 115.52],
  // SE corner - approaching Bukit
  [-8.55, 115.50],
  [-8.58, 115.48],
  [-8.60, 115.45],
  [-8.65, 115.45],
  [-8.70, 115.45],
  [-8.74, 115.45],
  [-8.78, 115.43],
  [-8.80, 115.40],
  [-8.81, 115.35],
  [-8.82, 115.30],
  [-8.82, 115.25],
  [-8.81, 115.20],
  [-8.80, 115.15],
  [-8.79, 115.10],
  [-8.78, 115.05],
  [-8.77, 115.00],
  [-8.76, 114.95],
  [-8.75, 114.90],
  [-8.74, 114.85],
  [-8.72, 114.80],
  [-8.70, 114.75],
  [-8.68, 114.70],
  [-8.65, 114.65],
  [-8.62, 114.60],
  [-8.58, 114.55],
  [-8.50, 114.50],
  [-8.40, 114.45],
  [-8.30, 114.43],
  [-8.20, 114.42],
  [-8.10, 114.43],
  [-8.075, 114.43],
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
for (const k of KECAMATAN_LIST) {
  if (!pointInPolygon(k.lat, k.lng, BALI_LAND)) {
    console.log(`❌ ${k.code} ${k.name} (${k.lat}, ${k.lng})`)
  }
}

console.log('\n=== MALLS OUTSIDE LAND ===')
for (const m of BALI_MALLS) {
  if (!pointInPolygon(m.lat, m.lng, BALI_LAND)) {
    console.log(`❌ ${m.id} ${m.name} → ${m.lat}, ${m.lng} (${m.kab})`)
  }
}

console.log('\n=== STORES OUTSIDE LAND ===')
for (const s of BALI_STORES) {
  if (!pointInPolygon(s.lat, s.lng, BALI_LAND)) {
    console.log(`❌ ${s.id} ${s.name} → ${s.lat}, ${s.lng}`)
  }
}

console.log('\n=== POIs OUTSIDE LAND ===')
for (const p of BALI_POIS) {
  if (!pointInPolygon(p.lat, p.lng, BALI_LAND)) {
    // For beaches, allow being slightly offshore
    const dist = 0.05 // ~5km tolerance for beach POIs
    const isCoastal = p.type === 'beach' || p.type === 'port' || p.type === 'temple'
    if (!isCoastal) {
      console.log(`❌ ${p.id} ${p.name} → ${p.lat}, ${p.lng} (${p.type})`)
    }
  }
}

console.log('\n=== KELURAHAN OUTSIDE LAND ===')
let badKel = 0
const badList: string[] = []
for (const k of BALI_KELURAHAN) {
  if (!pointInPolygon(k.lat, k.lng, BALI_LAND)) {
    badList.push(`❌ ${k.id} ${k.name} (${k.kab_name}) → ${k.lat.toFixed(4)}, ${k.lng.toFixed(4)}`)
    badKel++
  }
}
badList.slice(0, 50).forEach(l => console.log(l))
console.log(`Total bad kelurahan: ${badKel}/${BALI_KELURAHAN.length}`)
