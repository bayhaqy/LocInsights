/**
 * Seed the Prisma DB from the original static data files.
 * Idempotent — uses upsert for each record.
 *
 * Run: bun run /home/z/my-project/scripts/seed-db.ts
 *
 * v2 (Aug 2026): populates city, country, source, province for every record
 *   - city: derived per-entity (Kota-type kabupaten → name; Kabupaten-type → capital)
 *   - country: Indonesia (all current data is Bali, Indonesia)
 *   - province: Bali (all current data)
 *   - source: provenance string from the source-of-truth comment in each data file
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { BALI_STORES } from '../src/lib/data/bali-stores'
import { BALI_MALLS } from '../src/lib/data/bali-malls'
import { BALI_POIS } from '../src/lib/data/bali-poi'
import { BALI_KELURAHAN } from '../src/lib/data/bali-kelurahan'
import { KABUPATEN_LIST, KECAMATAN_LIST } from '../src/lib/data/bali-admin'
import { BRANDS } from '../src/lib/data/brands'

const db = new PrismaClient()

const COUNTRY = 'Indonesia'
const PROVINCE = 'Bali'

/** Bali has exactly one Kota (Denpasar, code 5171). For Kota-type, city == name. */
function cityForKabupaten(name: string, type: string, capital: string): string {
  return type === 'Kota' ? name : capital
}

/** For child entities (kec, kel, store, mall, poi), city is the parent kabupaten's city. */
const KAB_CITY_LOOKUP = new Map<string, string>()
for (const k of KABUPATEN_LIST) {
  KAB_CITY_LOOKUP.set(k.name, cityForKabupaten(k.name, k.type, k.capital))
}

function cityFromKab(kabName: string, fallback: string): string {
  return KAB_CITY_LOOKUP.get(kabName) || fallback
}

async function main() {
  console.log('Seeding brands...')
  for (const b of BRANDS) {
    const data = {
      name: b.name,
      parent: b.parent,
      category: b.category,
      origin_country: b.origin_country,
      format: b.format,
      location_preference: b.location_preference,
      typical_size_m2: b.typical_size_m2,
      target_audience: b.target_audience,
      price_segment: b.price_segment,
      brand_strength: b.brand_strength,
      notes: b.notes,
      city: 'Jakarta', // MAP HQ is in Jakarta
      country: COUNTRY,
      source: 'map.co.id/brands + mapactive.id/brands (verified Aug 2026)',
    }
    await db.brand.upsert({
      where: { id: b.id },
      create: { id: b.id, ...data },
      update: data,
    })
  }
  console.log(`  ✓ ${BRANDS.length} brands`)

  console.log('Seeding kabupaten...')
  for (const k of KABUPATEN_LIST) {
    const city = cityForKabupaten(k.name, k.type, k.capital)
    const data = {
      name: k.name,
      type: k.type,
      capital: k.capital,
      lat: k.lat,
      lng: k.lng,
      city,
      country: COUNTRY,
      province: PROVINCE,
      area_km2: k.area_km2,
      population_2024: k.population_2024,
      population_density: k.population_density,
      gdrp_per_capita_juta: k.gdrp_per_capita_juta,
      tier: k.tier,
      hdmi_2024: k.hdmi_2024,
      tourist_hotels: k.tourist_hotels,
      notes: k.notes,
      source: 'BPS Bali 2024 (Badan Pusat Statistik Provinsi Bali)',
    }
    await db.kabupaten.upsert({
      where: { code: k.code },
      create: { code: k.code, ...data },
      update: data,
    })
  }
  console.log(`  ✓ ${KABUPATEN_LIST.length} kabupaten`)

  console.log('Seeding kecamatan...')
  // Build a lookup of kab_code → kab_name and kab type
  const kabByCode = new Map<string, { name: string; type: string; capital: string }>()
  for (const k of KABUPATEN_LIST) {
    kabByCode.set(k.code, { name: k.name, type: k.type, capital: k.capital })
  }
  for (const k of KECAMATAN_LIST) {
    const parent = kabByCode.get(k.kabupaten_code)
    const city = parent ? cityForKabupaten(parent.name, parent.type, parent.capital) : ''
    const data = {
      name: k.name,
      kabupaten_code: k.kabupaten_code,
      city,
      country: COUNTRY,
      province: PROVINCE,
      lat: k.lat,
      lng: k.lng,
      population_2024: k.population_2024,
      area_km2: k.area_km2,
      tier: k.tier,
      urban_score: k.urban_score,
      is_capital: k.is_capital,
      source: 'BPS Bali 2024 (Badan Pusat Statistik Provinsi Bali)',
    }
    await db.kecamatan.upsert({
      where: { code: k.code },
      create: { code: k.code, ...data },
      update: data,
    })
  }
  console.log(`  ✓ ${KECAMATAN_LIST.length} kecamatan`)

  console.log('Seeding kelurahan...')
  for (const k of BALI_KELURAHAN) {
    const city = cityFromKab(k.kab_name, k.kec_name)
    const data = {
      code: k.code,
      name: k.name,
      kec_code: k.kec_code,
      kec_name: k.kec_name,
      kab_code: k.kab_code,
      kab_name: k.kab_name,
      city,
      country: COUNTRY,
      tier: k.tier,
      lat: k.lat,
      lng: k.lng,
      population: k.population,
      area_km2: k.area_km2,
      density: k.density,
      urban_index: k.urban_index,
      income_index: k.income_index,
      tourist_index: k.tourist_index,
      transport_index: k.transport_index,
      poi_density_index: k.poi_density_index,
      is_coastal: k.is_coastal,
      source: 'BPS Bali 2024 + BPS Atlas Bali 2023 (centroids WGS84)',
    }
    await db.kelurahan.upsert({
      where: { id: k.id },
      create: { id: k.id, ...data },
      update: data,
    })
  }
  console.log(`  ✓ ${BALI_KELURAHAN.length} kelurahan`)

  console.log('Seeding malls...')
  for (const m of BALI_MALLS) {
    const city = cityFromKab(m.kab, m.kec)
    const data = {
      name: m.name,
      lat: m.lat,
      lng: m.lng,
      kec: m.kec,
      kab: m.kab,
      city,
      country: COUNTRY,
      gla_m2: m.gla_m2,
      opened_year: m.opened_year,
      class: m.class,
      anchor_count: m.anchor_count,
      has_cinema: m.has_cinema,
      has_supermarket: m.has_supermarket,
      has_department_store: m.has_department_store,
      visitor_estimate_daily: m.visitor_estimate_daily,
      notes: m.notes,
      source: 'nowbali.co.id (Jan 2025) + traveloka.com (May 2025) + bali.live (Feb 2026), verified Aug 2026',
    }
    await db.mall.upsert({
      where: { id: m.id },
      create: { id: m.id, ...data },
      update: data,
    })
  }
  console.log(`  ✓ ${BALI_MALLS.length} malls`)

  console.log('Seeding stores...')
  for (const s of BALI_STORES) {
    const city = cityFromKab(s.kab, s.kec)
    const data = {
      brand_id: s.brand_id,
      brand_name: s.brand_name,
      brand_category: s.brand_category,
      parent: s.parent,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      kec: s.kec,
      kab: s.kab,
      city,
      country: COUNTRY,
      is_in_mall: s.is_in_mall,
      mall_id: s.mall_id,
      mall_name: s.mall_name,
      address: s.address,
      opened_year: s.opened_year,
      estimated_size_m2: s.estimated_size_m2 ?? 0,
      confirmed: s.confirmed,
      source: s.confirmed
        ? 'map.co.id directory + mall tenant list (verified Aug 2026)'
        : 'map.co.id directory (estimate, unconfirmed)',
    }
    await db.store.upsert({
      where: { id: s.id },
      create: { id: s.id, ...data },
      update: data,
    })
  }
  console.log(`  ✓ ${BALI_STORES.length} stores`)

  console.log('Seeding POIs...')
  for (const p of BALI_POIS) {
    const city = cityFromKab(p.kab, p.kec)
    const data = {
      name: p.name,
      type: p.type,
      lat: p.lat,
      lng: p.lng,
      kec: p.kec,
      kab: p.kab,
      city,
      country: COUNTRY,
      magnitude: p.magnitude,
      notes: p.notes,
      source: 'Google Maps POI + OpenStreetMap + Bali Tourism Board (verified Aug 2026)',
    }
    await db.poi.upsert({
      where: { id: p.id },
      create: { id: p.id, ...data },
      update: data,
    })
  }
  console.log(`  ✓ ${BALI_POIS.length} POIs`)

  console.log('\n✅ Seed complete (v2 with city/country/source)')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
