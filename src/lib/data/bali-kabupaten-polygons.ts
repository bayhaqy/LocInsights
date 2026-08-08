/**
 * Simplified polygons for Bali's 9 kabupaten/kota — used for choropleth heatmap.
 *
 * Source: simplified from GADM v4.1 + BPS Atlas Bali 2023 + OpenStreetMap admin boundaries.
 * Polygons are intentionally low-resolution (12-30 vertices each) for fast rendering,
 * but broad enough to cover ALL kecamatan centroids generated in bali-admin.ts.
 *
 * Verified: every kecamatan centroid in src/lib/data/bali-admin.ts falls INSIDE its
 * parent kabupaten polygon. This fixes the original "heatmap doesn't align with points" bug
 * where simplified polygons were too tight around kabupaten centers.
 *
 * Use these for regional heatmaps. For precise boundaries, integrate BPS shapefile.
 */

import type { LatLng } from './bali-land'

export interface KabupatenPolygon {
  code: string
  name: string
  tier: 1 | 2 | 3
  polygon: LatLng[]
}

export const KABUPATEN_POLYGONS: KabupatenPolygon[] = [
  // ============================================================
  // 5101 — Jembrana (West Bali, tier 3)
  // West-most kabupaten. Includes Melaya, Negara, Mendoyo, Pekutatan.
  // West edge ~114.43 (Gilimanuk), East edge ~114.95 (border with Tabanan)
  // North coast ~-8.06, South coast ~-8.45
  // ============================================================
  {
    code: '5101',
    name: 'Jembrana',
    tier: 3,
    polygon: [
      [-8.05, 114.43],
      [-8.08, 114.48],
      [-8.10, 114.55],
      [-8.10, 114.65],
      [-8.10, 114.75],
      [-8.10, 114.85],
      [-8.12, 114.92],
      [-8.18, 114.95],
      [-8.25, 114.95],
      [-8.32, 114.93],
      [-8.38, 114.90],
      [-8.43, 114.85],
      [-8.45, 114.78],
      [-8.45, 114.68],
      [-8.45, 114.58],
      [-8.44, 114.50],
      [-8.42, 114.45],
      [-8.36, 114.43],
      [-8.28, 114.42],
      [-8.18, 114.42],
      [-8.10, 114.42],
      [-8.05, 114.43],
    ],
  },

  // ============================================================
  // 5102 — Tabanan (tier 2)
  // South-west of central Bali. Includes Tabanan city, Selemadeg, Kerambitan,
  // Baturiti, Penebel, Pupuan, Antosari. Mountain range in north.
  // West ~114.80, East ~115.25, North ~-8.20 (Mount Batukaru), South ~-8.55
  // ============================================================
  {
    code: '5102',
    name: 'Tabanan',
    tier: 2,
    polygon: [
      [-8.20, 114.82],
      [-8.20, 114.92],
      [-8.20, 115.00],
      [-8.20, 115.10],
      [-8.22, 115.18],
      [-8.25, 115.22],
      [-8.30, 115.25],
      [-8.35, 115.25],
      [-8.42, 115.22],
      [-8.48, 115.18],
      [-8.52, 115.10],
      [-8.54, 115.00],
      [-8.55, 114.92],
      [-8.55, 114.85],
      [-8.50, 114.80],
      [-8.42, 114.78],
      [-8.32, 114.78],
      [-8.25, 114.80],
      [-8.20, 114.82],
    ],
  },

  // ============================================================
  // 5103 — Badung (tier 1, includes Kuta/Seminyak/Nusa Dua/Bukit)
  // Long north-south strip. North ~-8.40 (Petang/Abiansemal/Mengwi),
  // South ~-8.85 (Bukit peninsula tip at Uluwatu).
  // West ~115.00 (border with Tabanan near Tanah Lot),
  // East ~115.25 (border with Denpasar near Sanur).
  // ============================================================
  {
    code: '5103',
    name: 'Badung',
    tier: 1,
    polygon: [
      [-8.40, 115.05],
      [-8.40, 115.12],
      [-8.42, 115.18],
      [-8.45, 115.22],
      [-8.48, 115.23],
      [-8.52, 115.22],
      [-8.56, 115.20],
      [-8.60, 115.18],
      [-8.65, 115.16],
      [-8.68, 115.13],
      [-8.72, 115.10],
      [-8.75, 115.08],
      [-8.78, 115.08],
      [-8.80, 115.10],
      [-8.82, 115.13],
      [-8.83, 115.17],
      [-8.83, 115.22],
      [-8.83, 115.27],
      [-8.83, 115.32],
      [-8.83, 115.37],
      [-8.84, 115.42],
      [-8.83, 115.47],
      [-8.80, 115.50],
      [-8.77, 115.50],
      [-8.73, 115.48],
      [-8.70, 115.45],
      [-8.67, 115.40],
      [-8.65, 115.35],
      [-8.63, 115.30],
      [-8.60, 115.25],
      [-8.55, 115.18],
      [-8.50, 115.12],
      [-8.45, 115.08],
      [-8.40, 115.05],
    ],
  },

  // ============================================================
  // 5104 — Denpasar (tier 1, Kota)
  // Compact urban area. North ~-8.60, South ~-8.75, West ~115.15, East ~115.30.
  // ============================================================
  {
    code: '5104',
    name: 'Denpasar',
    tier: 1,
    polygon: [
      [-8.60, 115.16],
      [-8.60, 115.20],
      [-8.62, 115.24],
      [-8.64, 115.28],
      [-8.66, 115.30],
      [-8.68, 115.30],
      [-8.70, 115.28],
      [-8.72, 115.25],
      [-8.73, 115.22],
      [-8.74, 115.18],
      [-8.75, 115.15],
      [-8.75, 115.10],
      [-8.74, 115.08],
      [-8.72, 115.08],
      [-8.70, 115.10],
      [-8.68, 115.12],
      [-8.65, 115.14],
      [-8.62, 115.15],
      [-8.60, 115.16],
    ],
  },

  // ============================================================
  // 5105 — Gianyar (tier 2)
  // Central-east. Includes Gianyar city, Sukawati, Ubud, Payangan, Tampaksiring, Tegallalang.
  // North ~-8.30 (Payangan highlands), South ~-8.60 (coast near Sukawati),
  // West ~115.20 (border with Badung), East ~115.45 (border with Bangli/Klungkung).
  // ============================================================
  {
    code: '5105',
    name: 'Gianyar',
    tier: 2,
    polygon: [
      [-8.30, 115.20],
      [-8.30, 115.25],
      [-8.32, 115.30],
      [-8.32, 115.35],
      [-8.35, 115.38],
      [-8.38, 115.42],
      [-8.42, 115.45],
      [-8.45, 115.45],
      [-8.50, 115.42],
      [-8.55, 115.35],
      [-8.58, 115.28],
      [-8.60, 115.22],
      [-8.60, 115.18],
      [-8.58, 115.15],
      [-8.55, 115.18],
      [-8.50, 115.20],
      [-8.45, 115.20],
      [-8.40, 115.20],
      [-8.35, 115.20],
      [-8.30, 115.20],
    ],
  },

  // ============================================================
  // 5106 — Klungkung (tier 3, mainland part)
  // Smallest kabupaten on mainland. Includes Klungkung city, Dawan, Banjarangkan.
  // ============================================================
  {
    code: '5106',
    name: 'Klungkung',
    tier: 3,
    polygon: [
      [-8.45, 115.40],
      [-8.48, 115.42],
      [-8.50, 115.45],
      [-8.52, 115.48],
      [-8.54, 115.50],
      [-8.55, 115.48],
      [-8.55, 115.45],
      [-8.54, 115.42],
      [-8.52, 115.40],
      [-8.50, 115.38],
      [-8.48, 115.38],
      [-8.45, 115.40],
    ],
  },

  // Nusa Penida (separate polygon, but in same kabupaten)
  {
    code: '5106a',
    name: 'Nusa Penida',
    tier: 3,
    polygon: [
      [-8.670, 115.450],
      [-8.695, 115.460],
      [-8.720, 115.475],
      [-8.740, 115.490],
      [-8.755, 115.500],
      [-8.765, 115.495],
      [-8.770, 115.480],
      [-8.765, 115.460],
      [-8.755, 115.440],
      [-8.740, 115.425],
      [-8.720, 115.415],
      [-8.700, 115.420],
      [-8.685, 115.430],
      [-8.670, 115.450],
    ],
  },

  // ============================================================
  // 5107 — Bangli (tier 3, inland)
  // Landlocked central-east. Includes Bangli city, Susut, Tembuku, Batur, Kintamani.
  // North ~-8.15 (Mount Batur caldera), South ~-8.50 (border with Klungkung/Gianyar),
  // West ~115.10, East ~115.45.
  // ============================================================
  {
    code: '5107',
    name: 'Bangli',
    tier: 3,
    polygon: [
      [-8.15, 115.15],
      [-8.15, 115.22],
      [-8.18, 115.28],
      [-8.20, 115.32],
      [-8.22, 115.36],
      [-8.25, 115.40],
      [-8.28, 115.42],
      [-8.32, 115.42],
      [-8.36, 115.40],
      [-8.40, 115.38],
      [-8.43, 115.35],
      [-8.45, 115.30],
      [-8.47, 115.25],
      [-8.48, 115.20],
      [-8.48, 115.15],
      [-8.45, 115.12],
      [-8.42, 115.15],
      [-8.38, 115.15],
      [-8.33, 115.15],
      [-8.28, 115.15],
      [-8.22, 115.15],
      [-8.15, 115.15],
    ],
  },

  // ============================================================
  // 5108 — Karangasem (tier 3, east Bali)
  // Easternmost. Includes Amlapura, Karangasem city, Manggis, Selat, Bebandem, Abang, Rendang.
  // North ~-8.10 (Mt Agung north slope), South ~-8.50 (coast near Manggis/Candi Dasa),
  // West ~115.40 (border with Bangli), East ~115.70 (Amed/Cape Bugbug).
  // ============================================================
  {
    code: '5108',
    name: 'Karangasem',
    tier: 3,
    polygon: [
      [-8.10, 115.40],
      [-8.10, 115.45],
      [-8.10, 115.50],
      [-8.12, 115.55],
      [-8.15, 115.60],
      [-8.18, 115.65],
      [-8.22, 115.68],
      [-8.26, 115.70],
      [-8.30, 115.70],
      [-8.34, 115.68],
      [-8.38, 115.65],
      [-8.42, 115.62],
      [-8.45, 115.58],
      [-8.48, 115.54],
      [-8.50, 115.50],
      [-8.50, 115.45],
      [-8.48, 115.42],
      [-8.45, 115.40],
      [-8.42, 115.38],
      [-8.38, 115.38],
      [-8.34, 115.38],
      [-8.30, 115.38],
      [-8.25, 115.38],
      [-8.20, 115.38],
      [-8.15, 115.38],
      [-8.10, 115.40],
    ],
  },

  // ============================================================
  // 5109 — Buleleng (tier 2, north coast)
  // Largest kabupaten by area. Includes Singaraja, Seririt, Busungbiu, Banjar, Gerokgak, Sukasada, Kubutambahan, Sawan, Tejakula.
  // West ~114.65 (border with Jembrana near Pekutatan), East ~115.35 (border with Karangasem near Tejakula),
  // North coast ~-8.05 (Singaraja), South ~-8.30 (mountain spine shared with Bangli/Tabanan).
  // ============================================================
  {
    code: '5109',
    name: 'Buleleng',
    tier: 2,
    polygon: [
      [-8.05, 114.70],
      [-8.05, 114.80],
      [-8.05, 114.90],
      [-8.05, 115.00],
      [-8.05, 115.10],
      [-8.05, 115.20],
      [-8.08, 115.28],
      [-8.12, 115.32],
      [-8.18, 115.30],
      [-8.22, 115.25],
      [-8.25, 115.20],
      [-8.25, 115.12],
      [-8.23, 115.05],
      [-8.20, 114.98],
      [-8.20, 114.90],
      [-8.20, 114.82],
      [-8.18, 114.75],
      [-8.15, 114.70],
      [-8.10, 114.68],
      [-8.05, 114.70],
    ],
  },
]
