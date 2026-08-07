import { BALI_KELURAHAN } from '../src/lib/data/bali-kelurahan'
import { BALI_STORES } from '../src/lib/data/bali-stores'
import { BALI_MALLS } from '../src/lib/data/bali-malls'
import { BALI_POIS } from '../src/lib/data/bali-poi'
import { isOnBaliLand } from '../src/lib/data/bali-land'

let bad = 0
console.log('=== KELURAHAN (after fix) ===')
for (const k of BALI_KELURAHAN) {
  if (!isOnBaliLand(k.lat, k.lng)) {
    console.log(`❌ ${k.id} ${k.name} (${k.kab_name}) → ${k.lat.toFixed(4)}, ${k.lng.toFixed(4)}`)
    bad++
  }
}
console.log(`Bad kelurahan: ${bad}/${BALI_KELURAHAN.length}`)

console.log('\n=== STORES ===')
let badS = 0
for (const s of BALI_STORES) {
  if (!isOnBaliLand(s.lat, s.lng)) {
    console.log(`❌ ${s.id} ${s.name} → ${s.lat}, ${s.lng}`)
    badS++
  }
}
console.log(`Bad stores: ${badS}/${BALI_STORES.length}`)

console.log('\n=== MALLS ===')
let badM = 0
for (const m of BALI_MALLS) {
  if (!isOnBaliLand(m.lat, m.lng)) {
    console.log(`❌ ${m.id} ${m.name} → ${m.lat}, ${m.lng}`)
    badM++
  }
}
console.log(`Bad malls: ${badM}/${BALI_MALLS.length}`)

console.log('\n=== POIs ===')
let badP = 0
for (const p of BALI_POIS) {
  // Use 1km tolerance for beaches/ports/temples (these can be coastal)
  const tol = p.type === 'beach' || p.type === 'port' || p.type === 'temple' ? 1 : 0
  if (!isOnBaliLand(p.lat, p.lng, tol)) {
    console.log(`❌ ${p.id} ${p.name} → ${p.lat}, ${p.lng} (${p.type})`)
    badP++
  }
}
console.log(`Bad POIs: ${badP}/${BALI_POIS.length}`)
