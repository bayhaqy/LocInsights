/**
 * Coordinate validator for Bali
 * Bali bounding box: lat -8.82 to -8.06, lng 114.44 to 115.71
 * We flag any coordinate that is suspiciously far from known landmass.
 */
import { BALI_STORES } from '../src/lib/data/bali-stores'
import { BALI_MALLS } from '../src/lib/data/bali-malls'
import { BALI_POIS } from '../src/lib/data/bali-poi'
import { BALI_KELURAHAN } from '../src/lib/data/bali-kelurahan'

const BBOX = { minLat: -8.83, maxLat: -8.05, minLng: 114.43, maxLng: 115.72 }

function inBali(lat: number, lng: number) {
  return lat >= BBOX.minLat && lat <= BBOX.maxLat && lng >= BBOX.minLng && lng <= BBOX.maxLng
}

console.log('=== OUT-OF-BBOX STORES ===')
for (const s of BALI_STORES) {
  if (!inBali(s.lat, s.lng)) console.log(`❌ ${s.id} ${s.name} → lat=${s.lat}, lng=${s.lng}`)
}

console.log('\n=== OUT-OF-BBOX MALLS ===')
for (const m of BALI_MALLS) {
  if (!inBali(m.lat, m.lng)) console.log(`❌ ${m.id} ${m.name} → lat=${m.lat}, lng=${m.lng}`)
}

console.log('\n=== OUT-OF-BBOX POIs ===')
for (const p of BALI_POIS) {
  if (!inBali(p.lat, p.lng)) console.log(`❌ ${p.id} ${p.name} → lat=${p.lat}, lng=${p.lng}`)
}

console.log('\n=== OUT-OF-BBOX KELURAHAN ===')
let badKel = 0
for (const k of BALI_KELURAHAN) {
  if (!inBali(k.lat, k.lng)) {
    console.log(`❌ ${k.id} ${k.name} (${k.kab_name}) → lat=${k.lat}, lng=${k.lng}`)
    badKel++
    if (badKel > 15) { console.log('... (truncated)'); break }
  }
}

console.log(`\nTotal: ${BALI_STORES.length} stores, ${BALI_MALLS.length} malls, ${BALI_POIS.length} POIs, ${BALI_KELURAHAN.length} kelurahan`)
