/**
 * Seed the Prisma DB from the original static data files.
 * Idempotent — uses upsert for each record.
 *
 * Run: bun run /home/z/my-project/scripts/seed-db.ts
 */
import { PrismaClient } from '@prisma/client'
import { BALI_STORES } from '../src/lib/data/bali-stores'
import { BALI_MALLS } from '../src/lib/data/bali-malls'
import { BALI_POIS } from '../src/lib/data/bali-poi'
import { BALI_KELURAHAN } from '../src/lib/data/bali-kelurahan'
import { KABUPATEN_LIST, KECAMATAN_LIST } from '../src/lib/data/bali-admin'
import { BRANDS } from '../src/lib/data/brands'

const db = new PrismaClient()

async function main() {
  console.log('Seeding brands...')
  for (const b of BRANDS) {
    await db.brand.upsert({
      where: { id: b.id },
      create: {
        id: b.id,
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
      },
      update: {
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
      },
    })
  }
  console.log(`  ✓ ${BRANDS.length} brands`)

  console.log('Seeding kabupaten...')
  for (const k of KABUPATEN_LIST) {
    await db.kabupaten.upsert({
      where: { code: k.code },
      create: {
        code: k.code,
        name: k.name,
        type: k.type,
        capital: k.capital,
        lat: k.lat,
        lng: k.lng,
        area_km2: k.area_km2,
        population_2024: k.population_2024,
        population_density: k.population_density,
        gdrp_per_capita_juta: k.gdrp_per_capita_juta,
        tier: k.tier,
        hdmi_2024: k.hdmi_2024,
        tourist_hotels: k.tourist_hotels,
        notes: k.notes,
      },
      update: {
        name: k.name,
        type: k.type,
        capital: k.capital,
        lat: k.lat,
        lng: k.lng,
        area_km2: k.area_km2,
        population_2024: k.population_2024,
        population_density: k.population_density,
        gdrp_per_capita_juta: k.gdrp_per_capita_juta,
        tier: k.tier,
        hdmi_2024: k.hdmi_2024,
        tourist_hotels: k.tourist_hotels,
        notes: k.notes,
      },
    })
  }
  console.log(`  ✓ ${KABUPATEN_LIST.length} kabupaten`)

  console.log('Seeding kecamatan...')
  for (const k of KECAMATAN_LIST) {
    await db.kecamatan.upsert({
      where: { code: k.code },
      create: {
        code: k.code,
        name: k.name,
        kabupaten_code: k.kabupaten_code,
        lat: k.lat,
        lng: k.lng,
        population_2024: k.population_2024,
        area_km2: k.area_km2,
        tier: k.tier,
        urban_score: k.urban_score,
        is_capital: k.is_capital,
      },
      update: {
        name: k.name,
        kabupaten_code: k.kabupaten_code,
        lat: k.lat,
        lng: k.lng,
        population_2024: k.population_2024,
        area_km2: k.area_km2,
        tier: k.tier,
        urban_score: k.urban_score,
        is_capital: k.is_capital,
      },
    })
  }
  console.log(`  ✓ ${KECAMATAN_LIST.length} kecamatan`)

  console.log('Seeding kelurahan...')
  for (const k of BALI_KELURAHAN) {
    await db.kelurahan.upsert({
      where: { id: k.id },
      create: {
        id: k.id,
        code: k.code,
        name: k.name,
        kec_code: k.kec_code,
        kec_name: k.kec_name,
        kab_code: k.kab_code,
        kab_name: k.kab_name,
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
      },
      update: {
        code: k.code,
        name: k.name,
        kec_code: k.kec_code,
        kec_name: k.kec_name,
        kab_code: k.kab_code,
        kab_name: k.kab_name,
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
      },
    })
  }
  console.log(`  ✓ ${BALI_KELURAHAN.length} kelurahan`)

  console.log('Seeding malls...')
  for (const m of BALI_MALLS) {
    await db.mall.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        name: m.name,
        lat: m.lat,
        lng: m.lng,
        kec: m.kec,
        kab: m.kab,
        gla_m2: m.gla_m2,
        opened_year: m.opened_year,
        class: m.class,
        anchor_count: m.anchor_count,
        has_cinema: m.has_cinema,
        has_supermarket: m.has_supermarket,
        has_department_store: m.has_department_store,
        visitor_estimate_daily: m.visitor_estimate_daily,
        notes: m.notes,
      },
      update: {
        name: m.name,
        lat: m.lat,
        lng: m.lng,
        kec: m.kec,
        kab: m.kab,
        gla_m2: m.gla_m2,
        opened_year: m.opened_year,
        class: m.class,
        anchor_count: m.anchor_count,
        has_cinema: m.has_cinema,
        has_supermarket: m.has_supermarket,
        has_department_store: m.has_department_store,
        visitor_estimate_daily: m.visitor_estimate_daily,
        notes: m.notes,
      },
    })
  }
  console.log(`  ✓ ${BALI_MALLS.length} malls`)

  console.log('Seeding stores...')
  for (const s of BALI_STORES) {
    await db.store.upsert({
      where: { id: s.id },
      create: {
        id: s.id,
        brand_id: s.brand_id,
        brand_name: s.brand_name,
        brand_category: s.brand_category,
        parent: s.parent,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        kec: s.kec,
        kab: s.kab,
        is_in_mall: s.is_in_mall,
        mall_id: s.mall_id,
        mall_name: s.mall_name,
        address: s.address,
        opened_year: s.opened_year,
        estimated_size_m2: s.estimated_size_m2,
        confirmed: s.confirmed,
      },
      update: {
        brand_id: s.brand_id,
        brand_name: s.brand_name,
        brand_category: s.brand_category,
        parent: s.parent,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        kec: s.kec,
        kab: s.kab,
        is_in_mall: s.is_in_mall,
        mall_id: s.mall_id,
        mall_name: s.mall_name,
        address: s.address,
        opened_year: s.opened_year,
        estimated_size_m2: s.estimated_size_m2,
        confirmed: s.confirmed,
      },
    })
  }
  console.log(`  ✓ ${BALI_STORES.length} stores`)

  console.log('Seeding POIs...')
  for (const p of BALI_POIS) {
    await db.poi.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        name: p.name,
        type: p.type,
        lat: p.lat,
        lng: p.lng,
        kec: p.kec,
        kab: p.kab,
        magnitude: p.magnitude,
        notes: p.notes,
      },
      update: {
        name: p.name,
        type: p.type,
        lat: p.lat,
        lng: p.lng,
        kec: p.kec,
        kab: p.kab,
        magnitude: p.magnitude,
        notes: p.notes,
      },
    })
  }
  console.log(`  ✓ ${BALI_POIS.length} POIs`)

  console.log('\n✅ Seed complete')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
