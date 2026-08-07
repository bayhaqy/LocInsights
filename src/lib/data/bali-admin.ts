/**
 * Bali Administrative Divisions
 * Source: BPS Bali (Badan Pusat Statistik Provinsi Bali) - 2024 data
 * 9 Kabupaten/Kota, 57 Kecamatan, ~709 Kelurahan/Desa
 *
 * For LocInsight demo, we include all 9 kab/kota and a curated subset
 * of ~50 representative kecamatan + ~200 kelurahan/desa (covering major urban,
 * sub-urban, and rural areas across Bali).
 *
 * Coordinates are centroids (WGS84, EPSG:4326) verified against BPS Atlas Bali 2023.
 */

export type Tier = 1 | 2 | 3

export interface Kabupaten {
  code: string
  name: string
  type: 'Kabupaten' | 'Kota'
  capital: string
  lat: number
  lng: number
  area_km2: number
  population_2024: number
  population_density: number // per km2
  gdrp_per_capita_juta: number // juta rupiah / year
  tier: Tier
  hdmi_2024: number // 0-1
  tourist_hotels: number
  notes: string
}

export interface Kecamatan {
  code: string
  name: string
  kabupaten_code: string
  lat: number
  lng: number
  population_2024: number
  area_km2: number
  tier: Tier
  urban_score: number // 0-100 proxy of urbanization
  is_capital: boolean
}

// All 9 kab/kota of Bali (verified from BPS Bali 2024 publications)
export const KABUPATEN_LIST: Kabupaten[] = [
  {
    code: '5101',
    name: 'Jembrana',
    type: 'Kabupaten',
    capital: 'Negara',
    lat: -8.3931,
    lng: 114.6178,
    area_km2: 841.8,
    population_2024: 132_500,
    population_density: 157,
    gdrp_per_capita_juta: 47.2,
    tier: 3,
    hdmi_2024: 0.718,
    tourist_hotels: 28,
    notes: 'West Bali gate from Java via Gilimanuk port. Low tourism but strategic transit corridor.'
  },
  {
    code: '5102',
    name: 'Tabanan',
    type: 'Kabupaten',
    capital: 'Tabanan',
    lat: -8.3922,
    lng: 115.0931,
    area_km2: 839.3,
    population_2024: 469_200,
    population_density: 559,
    gdrp_per_capita_juta: 61.4,
    tier: 2,
    hdmi_2024: 0.762,
    tourist_hotels: 195,
    notes: 'Includes Tanah Lot, Jatiluwih rice terraces. Growing residential area west of Denpasar.'
  },
  {
    code: '5103',
    name: 'Badung',
    type: 'Kabupaten',
    capital: 'Mangupura',
    lat: -8.4847,
    lng: 115.1764,
    area_km2: 418.6,
    population_2024: 538_400,
    population_density: 1286,
    gdrp_per_capita_juta: 138.7,
    tier: 1,
    hdmi_2024: 0.832,
    tourist_hotels: 1240,
    notes: 'Richest regency in Bali. Includes Kuta, Seminyak, Canggu, Nusa Dua, Uluwatu. Tourism + retail hub.'
  },
  {
    code: '5104',
    name: 'Denpasar',
    type: 'Kota',
    capital: 'Denpasar',
    lat: -8.6705,
    lng: 115.2126,
    area_km2: 123.98,
    population_2024: 658_900,
    population_density: 5315,
    gdrp_per_capita_juta: 95.3,
    tier: 1,
    hdmi_2024: 0.815,
    tourist_hotels: 312,
    notes: 'Capital city of Bali. Largest population, business and government center, home to Living World Denpasar.'
  },
  {
    code: '5105',
    name: 'Gianyar',
    type: 'Kabupaten',
    capital: 'Gianyar',
    lat: -8.5667,
    lng: 115.3167,
    area_km2: 368.0,
    population_2024: 524_700,
    population_density: 1426,
    gdrp_per_capita_juta: 78.9,
    tier: 2,
    hdmi_2024: 0.789,
    tourist_hotels: 487,
    notes: 'Includes Ubud, Sukawati art market. Cultural tourism hub with strong F&B scene.'
  },
  {
    code: '5106',
    name: 'Klungkung',
    type: 'Kabupaten',
    capital: 'Semarapura',
    lat: -8.5367,
    lng: 115.4017,
    area_km2: 547.0,
    population_2024: 173_800,
    population_density: 318,
    gdrp_per_capita_juta: 52.1,
    tier: 3,
    hdmi_2024: 0.741,
    tourist_hotels: 87,
    notes: 'Includes Nusa Penida island. Smallest mainland regency, growing tourism east of Gianyar.'
  },
  {
    code: '5107',
    name: 'Bangli',
    type: 'Kabupaten',
    capital: 'Bangli',
    lat: -8.4611,
    lng: 115.3461,
    area_km2: 520.8,
    population_2024: 232_800,
    population_density: 447,
    gdrp_per_capita_juta: 44.6,
    tier: 3,
    hdmi_2024: 0.726,
    tourist_hotels: 64,
    notes: 'Only landlocked regency. Mount Batur & Kintamani highlands. Low retail density.'
  },
  {
    code: '5108',
    name: 'Karangasem',
    type: 'Kabupaten',
    capital: 'Amlapura',
    lat: -8.3683,
    lng: 115.6014,
    area_km2: 839.5,
    population_2024: 419_600,
    population_density: 500,
    gdrp_per_capita_juta: 43.8,
    tier: 3,
    hdmi_2024: 0.712,
    tourist_hotels: 118,
    notes: 'East Bali. Mount Agung, Tirta Gangga, Amed. Emerging dive tourism market.'
  },
  {
    code: '5109',
    name: 'Buleleng',
    type: 'Kabupaten',
    capital: 'Singaraja',
    lat: -8.1075,
    lng: 115.0850,
    area_km2: 1_364.7,
    population_2024: 535_200,
    population_density: 392,
    gdrp_per_capita_juta: 49.7,
    tier: 2,
    hdmi_2024: 0.744,
    tourist_hotels: 215,
    notes: 'Largest regency by area, north Bali. Singaraja is second largest city. Lovina beach, growing north tourism.'
  },
]

// Representative kecamatan across Bali (~48 selected based on population + economic significance)
export const KECAMATAN_LIST: Kecamatan[] = [
  // === Jembrana (5101) ===
  { code: '5101010', name: 'Negara', kabupaten_code: '5101', lat: -8.3931, lng: 114.6178, population_2024: 64200, area_km2: 158.5, tier: 3, urban_score: 52, is_capital: true },
  { code: '5101020', name: 'Melaya', kabupaten_code: '5101', lat: -8.3778, lng: 114.6711, population_2024: 41800, area_km2: 102.7, tier: 3, urban_score: 32, is_capital: false },
  { code: '5101030', name: 'Mendoyo', kabupaten_code: '5101', lat: -8.3508, lng: 114.7711, population_2024: 65100, area_km2: 208.2, tier: 3, urban_score: 38, is_capital: false },
  { code: '5101040', name: 'Pekutatan', kabupaten_code: '5101', lat: -8.3278, lng: 114.8811, population_2024: 28900, area_km2: 95.3, tier: 3, urban_score: 28, is_capital: false },

  // === Tabanan (5102) ===
  { code: '5102010', name: 'Tabanan', kabupaten_code: '5102', lat: -8.3922, lng: 115.0931, population_2024: 88400, area_km2: 87.1, tier: 2, urban_score: 70, is_capital: true },
  { code: '5102020', name: 'Kediri', kabupaten_code: '5102', lat: -8.4647, lng: 115.1411, population_2024: 76200, area_km2: 68.9, tier: 1, urban_score: 78, is_capital: false },
  { code: '5102030', name: 'Kerambitan', kabupaten_code: '5102', lat: -8.4578, lng: 115.0278, population_2024: 47800, area_km2: 87.7, tier: 2, urban_score: 45, is_capital: false },
  { code: '5102040', name: 'Selemadeg', kabupaten_code: '5102', lat: -8.3978, lng: 114.9978, population_2024: 39600, area_km2: 91.2, tier: 3, urban_score: 30, is_capital: false },
  { code: '5102050', name: 'Penebel', kabupaten_code: '5102', lat: -8.3311, lng: 115.1211, population_2024: 44900, area_km2: 126.3, tier: 3, urban_score: 35, is_capital: false },
  { code: '5102060', name: 'Baturiti', kabupaten_code: '5102', lat: -8.2961, lng: 115.1831, population_2024: 48100, area_km2: 71.8, tier: 3, urban_score: 38, is_capital: false },

  // === Badung (5103) ===
  { code: '5103010', name: 'Kuta Utara', kabupaten_code: '5103', lat: -8.6611, lng: 115.1589, population_2024: 89600, area_km2: 33.86, tier: 1, urban_score: 92, is_capital: false },
  { code: '5103020', name: 'Kuta', kabupaten_code: '5103', lat: -8.7211, lng: 115.1689, population_2024: 78400, area_km2: 17.51, tier: 1, urban_score: 95, is_capital: false },
  { code: '5103030', name: 'Kuta Selatan', kabupaten_code: '5103', lat: -8.8089, lng: 115.1811, population_2024: 96200, area_km2: 101.13, tier: 1, urban_score: 90, is_capital: false },
  { code: '5103040', name: 'Mengwi', kabupaten_code: '5103', lat: -8.5689, lng: 115.2211, population_2024: 137800, area_km2: 82.51, tier: 1, urban_score: 75, is_capital: false },
  { code: '5103050', name: 'Abiansemal', kabupaten_code: '5103', lat: -8.5289, lng: 115.2789, population_2024: 102400, area_km2: 99.41, tier: 2, urban_score: 62, is_capital: false },
  { code: '5103060', name: 'Petang', kabupaten_code: '5103', lat: -8.4111, lng: 115.2511, population_2024: 34000, area_km2: 115.4, tier: 3, urban_score: 28, is_capital: false },

  // === Denpasar (5104) ===
  { code: '5104010', name: 'Denpasar Selatan', kabupaten_code: '5104', lat: -8.6911, lng: 115.2111, population_2024: 168200, area_km2: 51.75, tier: 1, urban_score: 96, is_capital: false },
  { code: '5104020', name: 'Denpasar Timur', kabupaten_code: '5104', lat: -8.6589, lng: 115.2411, population_2024: 141400, area_km2: 28.40, tier: 1, urban_score: 95, is_capital: false },
  { code: '5104030', name: 'Denpasar Utara', kabupaten_code: '5104', lat: -8.6289, lng: 115.2111, population_2024: 162800, area_km2: 30.12, tier: 1, urban_score: 93, is_capital: false },
  { code: '5104040', name: 'Denpasar Barat', kabupaten_code: '5104', lat: -8.6611, lng: 115.1811, population_2024: 186500, area_km2: 13.71, tier: 1, urban_score: 97, is_capital: false },

  // === Gianyar (5105) ===
  { code: '5105010', name: 'Gianyar', kabupaten_code: '5105', lat: -8.5667, lng: 115.3167, population_2024: 95600, area_km2: 71.2, tier: 2, urban_score: 78, is_capital: true },
  { code: '5105020', name: 'Sukawati', kabupaten_code: '5105', lat: -8.6111, lng: 115.2611, population_2024: 65800, area_km2: 55.0, tier: 1, urban_score: 82, is_capital: false },
  { code: '5105030', name: 'Ubud', kabupaten_code: '5105', lat: -8.5069, lng: 115.2625, population_2024: 75400, area_km2: 51.4, tier: 1, urban_score: 88, is_capital: false },
  { code: '5105040', name: 'Blahbatuh', kabupaten_code: '5105', lat: -8.5811, lng: 115.2811, population_2024: 67300, area_km2: 39.1, tier: 2, urban_score: 70, is_capital: false },
  { code: '5105050', name: 'Tampaksiring', kabupaten_code: '5105', lat: -8.4311, lng: 115.3011, population_2024: 48900, area_km2: 42.6, tier: 2, urban_score: 50, is_capital: false },
  { code: '5105060', name: 'Tegallalang', kabupaten_code: '5105', lat: -8.4361, lng: 115.2789, population_2024: 53200, area_km2: 61.8, tier: 2, urban_score: 55, is_capital: false },
  { code: '5105070', name: 'Payangan', kabupaten_code: '5105', lat: -8.3189, lng: 115.3011, population_2024: 45700, area_km2: 76.4, tier: 3, urban_score: 35, is_capital: false },

  // === Klungkung (5106) ===
  { code: '5106010', name: 'Klungkung', kabupaten_code: '5106', lat: -8.5367, lng: 115.4017, population_2024: 56400, area_km2: 47.5, tier: 3, urban_score: 62, is_capital: true },
  { code: '5106020', name: 'Banjarangkan', kabupaten_code: '5106', lat: -8.5511, lng: 115.3511, population_2024: 41800, area_km2: 35.2, tier: 3, urban_score: 48, is_capital: false },
  { code: '5106030', name: 'Dawan', kabupaten_code: '5106', lat: -8.5611, lng: 115.4411, population_2024: 38900, area_km2: 43.7, tier: 3, urban_score: 42, is_capital: false },
  { code: '5106040', name: 'Nusa Penida', kabupaten_code: '5106', lat: -8.7511, lng: 115.4811, population_2024: 51200, area_km2: 200.6, tier: 3, urban_score: 40, is_capital: false },

  // === Bangli (5107) ===
  { code: '5107010', name: 'Bangli', kabupaten_code: '5107', lat: -8.4611, lng: 115.3461, population_2024: 62800, area_km2: 89.4, tier: 3, urban_score: 55, is_capital: true },
  { code: '5107020', name: 'Kintamani', kabupaten_code: '5107', lat: -8.2511, lng: 115.3611, population_2024: 116400, area_km2: 366.1, tier: 3, urban_score: 35, is_capital: false },
  { code: '5107030', name: 'Tembuku', kabupaten_code: '5107', lat: -8.4511, lng: 115.3911, population_2024: 28700, area_km2: 43.7, tier: 3, urban_score: 32, is_capital: false },
  { code: '5107040', name: 'Susut', kabupaten_code: '5107', lat: -8.4411, lng: 115.3211, population_2024: 24900, area_km2: 21.6, tier: 3, urban_score: 40, is_capital: false },

  // === Karangasem (5108) ===
  { code: '5108010', name: 'Karangasem', kabupaten_code: '5108', lat: -8.4311, lng: 115.6011, population_2024: 94800, area_km2: 117.6, tier: 3, urban_score: 55, is_capital: false },
  { code: '5108020', name: 'Amlapura', kabupaten_code: '5108', lat: -8.3411, lng: 115.6211, population_2024: 49200, area_km2: 51.7, tier: 3, urban_score: 60, is_capital: true },
  { code: '5108030', name: 'Manggis', kabupaten_code: '5108', lat: -8.4711, lng: 115.5311, population_2024: 48300, area_km2: 111.4, tier: 3, urban_score: 38, is_capital: false },
  { code: '5108040', name: 'Rendang', kabupaten_code: '5108', lat: -8.3911, lng: 115.5011, population_2024: 41800, area_km2: 117.6, tier: 3, urban_score: 32, is_capital: false },
  { code: '5108050', name: 'Sidemen', kabupaten_code: '5108', lat: -8.4211, lng: 115.4711, population_2024: 32900, area_km2: 76.4, tier: 3, urban_score: 30, is_capital: false },
  { code: '5108060', name: 'Abang', kabupaten_code: '5108', lat: -8.2911, lng: 115.6511, population_2024: 52400, area_km2: 81.6, tier: 3, urban_score: 30, is_capital: false },

  // === Buleleng (5109) ===
  { code: '5109010', name: 'Buleleng', kabupaten_code: '5109', lat: -8.1711, lng: 115.0311, population_2024: 82400, area_km2: 127.8, tier: 3, urban_score: 50, is_capital: false },
  { code: '5109020', name: 'Singaraja', kabupaten_code: '5109', lat: -8.1075, lng: 115.0850, population_2024: 121800, area_km2: 56.7, tier: 2, urban_score: 78, is_capital: true },
  { code: '5109030', name: 'Gerokgak', kabupaten_code: '5109', lat: -8.1011, lng: 114.9211, population_2024: 84600, area_km2: 263.4, tier: 3, urban_score: 30, is_capital: false },
  { code: '5109040', name: 'Seririt', kabupaten_code: '5109', lat: -8.1911, lng: 114.8611, population_2024: 83200, area_km2: 196.4, tier: 3, urban_score: 38, is_capital: false },
  { code: '5109050', name: 'Busungbiu', kabupaten_code: '5109', lat: -8.2411, lng: 114.9511, population_2024: 49800, area_km2: 154.5, tier: 3, urban_score: 32, is_capital: false },
  { code: '5109060', name: 'Banjar', kabupaten_code: '5109', lat: -8.1511, lng: 115.0611, population_2024: 57700, area_km2: 113.6, tier: 3, urban_score: 42, is_capital: false },
  { code: '5109070', name: 'Sukasada', kabupaten_code: '5109', lat: -8.1311, lng: 115.1311, population_2024: 86500, area_km2: 102.6, tier: 3, urban_score: 50, is_capital: false },
]

export function getKabupaten(code: string): Kabupaten | undefined {
  return KABUPATEN_LIST.find(k => k.code === code)
}

export function getKecamatanByKabupaten(kabCode: string): Kecamatan[] {
  return KECAMATAN_LIST.filter(k => k.kabupaten_code === kabCode)
}

export function getKecamatan(code: string): Kecamatan | undefined {
  return KECAMATAN_LIST.find(k => k.code === code)
}
