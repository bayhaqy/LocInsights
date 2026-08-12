'use client'

/**
 * Documentation page — comprehensive user + technical documentation for LocInsight.
 *
 * Five sections:
 *   1. Data Sources       — full provenance links (URL, file, API) for every
 *                            raw dataset, so management can audit credibility.
 *   2. Data Dictionary    — definitions for every table, column, calculation,
 *                            and metric so management can interpret any number.
 *   3. User Guide         — how-to guides for each menu (Dashboard, Map, etc.).
 *   4. Technical Docs     — architecture, schema, API, scoring math, ML model.
 *   5. Custom Notes       — editable markdown scratchpad with live preview.
 *
 * The Custom Notes tab is the editable markdown feature requested by the user
 * (Aug 2026). It supports a textarea editor on the left and a rendered preview
 * on the right. Content persists to localStorage so edits survive reloads.
 *
 * Markdown rendering is done via a small built-in renderer (no external deps)
 * that supports: headings, bold/italic, lists, tables, code blocks, links,
 * blockquotes, hr, inline code. This is sufficient for technical documentation
 * and avoids the npm install footprint of react-markdown.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BookOpen, Database, Table, Code, FileText, Edit3, Eye, Save, Trash2,
  ExternalLink, Search, ChevronDown, ChevronRight, Key, Shield, Server,
  HardDrive, Cpu, GitBranch, Lock, ScrollText, MapPin, Calculator,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-provider'

// ============================================================================
// DATA SOURCES — full provenance links
// ============================================================================
const DATA_SOURCES = [
  {
    category: 'Government Statistics',
    title: 'BPS Bali — Badan Pusat Statistik Provinsi Bali',
    desc: 'Population per kabupaten/kecamatan/kelurahan, GDRP per capita, Human Development Index (IPM) 2024. Used for demographic metrics, income index, and tier classification.',
    license: 'Public — Government Open Data',
    update_freq: 'Annually (Bali Dalam Angka published Feb each year)',
    urls: [
      { label: 'BPS Bali Portal', href: 'https://bali.bps.go.id/' },
      { label: 'BPS Web API (StatistikKu)', href: 'https://webapi.bps.go.id/developer/' },
      { label: 'Bali Dalam Angka 2024 (PDF)', href: 'https://bali.bps.go.id/publikasi/2024/02/28/0ce40c4eb86d00f5ed80be81c192b1ae/provinsi-bali-dalam-angka-2024.html' },
      { label: 'BPS Dynamic Tables', href: 'https://www.bps.go.id/id/statistics-table' },
    ],
    files: [
      { label: 'Bali Dalam Angka 2024 — PDF (8.2 MB)', href: 'https://bali.bps.go.id/publikasi/2024/02/28/0ce40c4eb86d00f5ed80be81c192b1ae/provinsi-bali-dalam-angka-2024.html' },
    ],
  },
  {
    category: 'Company Public',
    title: 'MAP Brand Directory — PT Mitra Adiperkasa Tbk',
    desc: 'Verified list of MAP brands by category (F&B, Sports, Fashion, Department Store, Kids). Used for brand_metadata + store directory baseline.',
    license: 'Public — Company Website',
    update_freq: 'Quarterly (corporate website refreshes)',
    urls: [
      { label: 'map.co.id (main)', href: 'https://www.map.co.id/' },
      { label: 'MAP Brand Portfolio', href: 'https://www.map.co.id/brands' },
      { label: 'MAP Investor Relations', href: 'https://www.map.co.id/investor-relations' },
      { label: 'MAP Annual Report 2024 (PDF)', href: 'https://www.map.co.id/investor-relations/annual-reports' },
    ],
    files: [],
  },
  {
    category: 'Company Public',
    title: 'MAP Active Adiperkasa (MAA) Brand Portfolio',
    desc: 'Sports/Leisure/Kids brand portfolio under MAP Active Adiperkasa. Used for MAA-specific brand_metadata + store directory.',
    license: 'Public — Company Website',
    update_freq: 'Quarterly',
    urls: [
      { label: 'mapactive.id (main)', href: 'https://www.mapactive.id/' },
      { label: 'MAA Brand List', href: 'https://www.mapactive.id/brands' },
      { label: 'SGB Online Store Directory', href: 'https://www.sgbonline.com/' },
    ],
    files: [],
  },
  {
    category: 'Travel Directories',
    title: 'Bali Mall Catalog',
    desc: 'Mall names, location coordinates, GLA (Gross Leasable Area) estimates, opening year, class (A/B/C). Verified against each mall’s official website + Google Maps.',
    license: 'Public — Mall websites + Google Places',
    update_freq: 'Continuous (OSM Overpass cron daily)',
    urls: [
      { label: 'Discovery Shopping Mall (Kuta)', href: 'https://www.discoverybalimall.com/' },
      { label: 'Beachwalk Shopping Center (Kuta)', href: 'https://www.beachwalkbali.com/' },
      { label: 'Lippo Mall Kuta', href: 'https://www.lippomallkuta.com/' },
      { label: 'Trans Studio Mall Bali', href: 'https://www.transstudiobali.com/' },
      { label: 'Level 21 Mall (Denpasar)', href: 'https://www.level21mall.com/' },
      { label: 'Park 23 Mall (Denpasar)', href: 'https://www.park23bali.com/' },
      { label: 'Living World Denpasar', href: 'https://livingworld.id/mall/living-world-denpasar/' },
      { label: 'Ramayana Mall Bali', href: 'https://www.ramayana.co.id/' },
    ],
    files: [],
  },
  {
    category: 'Open Geodata',
    title: 'OpenStreetMap — POI Export (Bali bounding box)',
    desc: 'Tourist attractions, beaches, temples, hotels, transit hubs, universities, hospitals, markets, government offices. ODbL license. Used for POI layer + magnitude scoring.',
    license: 'Open Database License (ODbL) — free to share + adapt',
    update_freq: 'Continuous (live OSM edits, scraper daily)',
    urls: [
      { label: 'OpenStreetMap Main', href: 'https://www.openstreetmap.org/' },
      { label: 'OSM Bali BBox View', href: 'https://www.openstreetmap.org/#map=10/-8.4095/115.1889' },
      { label: 'Geofabrik Indonesia Extract', href: 'https://download.geofabrik.de/asia/indonesia.html' },
    ],
    files: [
      { label: 'bali-latest.osm.pbf (Geofabrik, ~50 MB)', href: 'https://download.geofabrik.de/asia/indonesia.html' },
    ],
  },
  {
    category: 'Open Geodata',
    title: 'GADM v4.1 — Administrative Boundaries',
    desc: 'Real Bali administrative polygons (kabupaten=9, kecamatan=~59). Used for choropleth visualization with filled color areas.',
    license: 'Academic use — free for non-commercial',
    update_freq: 'Static (GADM v4.1, 2022 release)',
    urls: [
      { label: 'GADM.org', href: 'https://gadm.org/' },
      { label: 'GADM Bali Map', href: 'https://gadm.org/maps/IDN/bali.html' },
      { label: 'GADM Download (Bali Shapefile)', href: 'https://gadm.org/download_country.html' },
    ],
    files: [
      { label: 'gadm41_IDN_shp.zip (Indonesia, 78 MB)', href: 'https://geodata.ucdavis.edu/gadm/gadm4.1/shp/gadm41_IDN_shp.zip' },
    ],
  },
  {
    category: 'Government Shapefile',
    title: 'BPS Shapefile — Kelurahan/Desa Boundaries (709 villages)',
    desc: 'Administrative boundaries at the kelurahan (village) level for full 709 kelurahan coverage across Bali. Used for kelurahan-level choropleth + accurate area/density calculations.',
    license: 'Public — BPS Open Data',
    update_freq: 'Static (BPS 2024 release)',
    urls: [
      { label: 'BPS Interactive Map', href: 'https://www.bps.go.id/id/interaktive-peta/2024/01/12/m2024fd6c4f9e0c.html' },
      { label: 'BPS Publications', href: 'https://www.bps.go.id/id/publication' },
      { label: 'BIG (Indonesian Geoportal)', href: 'https://www.big.go.id/' },
      { label: 'Kemendagri Wilayah API', href: 'https://www.emsifa.com/api-wilayah-indonesia/' },
    ],
    files: [
      { label: 'Bali Kelurahan Shapefile (roadmap)', href: 'https://www.bps.go.id/id/publication/2024/01/12/m2024fd6c4f9e0c.html' },
    ],
  },
  {
    category: 'Map Tiles',
    title: 'CARTO Light Basemap + OpenStreetMap Tiles',
    desc: 'Vector tile basemap for clean professional visualization. CARTO Light style for daytime UI. Used by React-Leaflet for the base map layer.',
    license: 'Free for non-commercial with attribution (ODbL)',
    update_freq: 'Continuous (live tile updates)',
    urls: [
      { label: 'CARTO Basemaps', href: 'https://carto.com/basemaps/' },
      { label: 'CARTO Light Style', href: 'https://carto.com/basemaps/light_all/' },
      { label: 'OSM Tile Usage Policy', href: 'https://operations.osmfoundation.org/policies/tiles/' },
    ],
    files: [],
  },
  {
    category: 'Live API',
    title: 'Nominatim + Overpass API — Live Geocoding + POI Queries',
    desc: 'Live geocoding (address → lat/lng) and Overpass queries (POI by tag/bbox) for the Data Scraper. Rate-limited per OSM usage policy (1 req/sec).',
    license: 'Free with rate-limit (1 req/sec per IP)',
    update_freq: 'Live (real-time OSM data)',
    urls: [
      { label: 'Nominatim Geocoder API', href: 'https://nominatim.openstreetmap.org/' },
      { label: 'Overpass API Main', href: 'https://overpass-api.de/' },
      { label: 'Overpass Turbo (interactive)', href: 'https://overpass-turbo.eu/' },
      { label: 'OSM Usage Policy', href: 'https://wiki.openstreetmap.org/wiki/Usage_policy' },
    ],
    files: [],
  },
  {
    category: 'Academic Research',
    title: 'Best Practices & Research References (2024-2026)',
    desc: 'Peer-reviewed academic research and industry best practices from leading location intelligence vendors. Used to validate the scoring framework and methodology.',
    license: 'Mixed — see each reference',
    update_freq: 'Curated annually',
    urls: [
      { label: 'OnSpot Data — Retail Site Selection Guide (Mar 2026)', href: 'https://onspotdata.com/resources/news-updates/retail-site-selection-guide' },
      { label: 'Felt.com — Retail location analytics (Jun 2026)', href: 'https://felt.com/blog/retail-location-analytics' },
      { label: 'GrowthFactor.ai — Site Selection Analytics (Aug 2025)', href: 'https://growthfactor.ai/resources/blog/site-selection-analytics' },
      { label: 'Targomo — Gravitational Models Whitepaper (Sep 2025)', href: 'https://targomo.com/whitepaper-retail-branch-location-gravitational-models' },
      { label: 'MIT — Validating Gravity-Based Market Share Models (2021)', href: 'https://dspace.mit.edu/bitstream/handle/1721.1/146605/big.2020.0161.pdf' },
      { label: 'MDPI ISPRS — Bibliometric Analysis of Geomarketing (2025)', href: 'https://www.mdpi.com/2220-9964/14/8/282' },
      { label: 'Placer.ai — Retail Site Selection Guide (2024)', href: 'https://placer.ai/guides/retail-site-selection' },
      { label: 'xmap.ai — 10 Ways Location Intelligence (Jun 2025)', href: 'https://xmap.ai/blog/10-ways-location-intelligence-can-transform-retail-site-selection' },
    ],
    files: [],
  },
]

// ============================================================================
// DATA DICTIONARY — table/column/calculation definitions
// ============================================================================
interface ColumnDef {
  name: string
  type: string
  desc: string
  source?: string
  example?: string
}
interface TableDef {
  name: string
  purpose: string
  row_count?: string
  source: string
  columns: ColumnDef[]
}

const DATA_DICTIONARY: TableDef[] = [
  {
    name: 'kelurahan',
    purpose: 'Master table of Bali villages (kelurahan/desa) with demographic metrics. One row = one village.',
    row_count: '~709 villages (Bali province)',
    source: 'BPS Bali 2024 + GADM v4.1 boundaries',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'Unique kelurahan code, format: kab_code + kec_code + kel_code (e.g. 5101011001)', source: 'BPS', example: '5101011001' },
      { name: 'name', type: 'TEXT', desc: 'Kelurahan/Desa name in Indonesian (e.g. Dangin Puri Klod)', source: 'BPS' },
      { name: 'kec_code', type: 'TEXT (FK)', desc: 'Foreign key → kecamatan.code', source: 'BPS' },
      { name: 'kec_name', type: 'TEXT', desc: 'Kecamatan (sub-district) name', source: 'BPS' },
      { name: 'kab_code', type: 'TEXT (FK)', desc: 'Foreign key → kabupaten.code', source: 'BPS' },
      { name: 'kab_name', type: 'TEXT', desc: 'Kabupaten/Kota (regency) name', source: 'BPS' },
      { name: 'tier', type: 'TEXT', desc: 'Economic tier: tier_1 (Badung/Denpasar), tier_2 (Tabanan/Gianyar/Buleleng), tier_3 (Jembrana/Klungkung/Bangli/Karangasem)', source: 'Computed from BPS GDRP per capita', example: 'tier_1' },
      { name: 'lat, lng', type: 'FLOAT8', desc: 'Centroid latitude/longitude (WGS84). Used for map markers + choropleth cells.', source: 'BPS / OSM centroid', example: '-8.6700, 115.2130' },
      { name: 'population', type: 'INT', desc: 'Total population (BPS 2024 projection)', source: 'BPS Bali Dalam Angka 2024', example: '12134' },
      { name: 'area_km2', type: 'FLOAT', desc: 'Land area in square kilometers', source: 'BPS / GADM polygon area', example: '4.82' },
      { name: 'density', type: 'FLOAT', desc: 'Population density = population / area_km2 (people per km²)', source: 'Computed', example: '2517.4' },
      { name: 'income_index', type: 'FLOAT (0-100)', desc: 'Purchasing power index, normalized from GDRP per capita. 100 = highest in Bali.', source: 'Computed from BPS GDRP per capita', example: '78.3' },
      { name: 'urban_index', type: 'FLOAT (0-100)', desc: 'Urbanization index based on population density + non-agricultural workforce %.', source: 'Computed from BPS', example: '85.1' },
      { name: 'tourist_index', type: 'FLOAT (0-100)', desc: 'Tourism intensity based on nearby tourist POI count + hotel density.', source: 'Computed from OSM POI', example: '92.4' },
      { name: 'transport_index', type: 'FLOAT (0-100)', desc: 'Transport connectivity based on nearby transit POIs (airport, port, bus terminal, major roads).', source: 'Computed from OSM POI', example: '67.8' },
      { name: 'poi_density_index', type: 'FLOAT (0-100)', desc: 'General POI density — mix of all amenities (restaurants, shops, banks, etc.) within 1 km.', source: 'Computed from OSM POI', example: '54.2' },
      { name: 'is_coastal', type: 'BOOLEAN', desc: 'True if kelurahan borders the sea (used for tourism premium).', source: 'GADM polygon intersection with coastline', example: 'true' },
    ],
  },
  {
    name: 'stores',
    purpose: 'MAP/MAA retail outlets. One row = one physical store.',
    row_count: '~150+ stores across Bali',
    source: 'MAP brand directory + MAA portfolio + manual verification',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'UUID v4 store ID', example: 'a1b2c3d4-...' },
      { name: 'brand_id', type: 'TEXT (FK)', desc: 'Foreign key → brands.id' },
      { name: 'brand_name', type: 'TEXT', desc: 'Brand name (e.g. Starbucks, Sports Station, Planet Sports)', source: 'brands.name' },
      { name: 'brand_category', type: 'ENUM', desc: 'Brand category: food_beverage, sports, fashion, department_store, kids, lifestyle, beauty, athleisure, footwear', source: 'brands.category' },
      { name: 'parent', type: 'ENUM', desc: 'Parent company: MAP (Mitra Adiperkasa) or MAA (MAP Active Adiperkasa)', source: 'brands.parent' },
      { name: 'name', type: 'TEXT', desc: 'Store branch name (e.g. "Starbucks Discovery Shopping Mall")', example: 'Starbucks DSM' },
      { name: 'lat, lng', type: 'FLOAT8', desc: 'Store location coordinates (WGS84)', source: 'OSM geocoding or manual' },
      { name: 'kec, kab', type: 'TEXT', desc: 'Kecamatan + kabupaten where the store is located' },
      { name: 'is_in_mall', type: 'BOOLEAN', desc: 'True if store is inside a mall (vs street-level)', example: 'true' },
      { name: 'mall_id', type: 'TEXT (FK, nullable)', desc: 'Foreign key → malls.id (only if is_in_mall=true)' },
      { name: 'mall_name', type: 'TEXT (nullable)', desc: 'Mall name (denormalized for quick display)' },
      { name: 'address', type: 'TEXT', desc: 'Full street address' },
      { name: 'opened_year', type: 'INT', desc: 'Year the store opened', example: '2019' },
      { name: 'confirmed', type: 'BOOLEAN', desc: 'True if location has been verified by field survey, false if estimated from mall directory', example: 'true' },
    ],
  },
  {
    name: 'malls',
    purpose: 'Shopping malls in Bali. One row = one mall.',
    row_count: '~15+ major malls tracked',
    source: 'Bali Mall Catalog (official mall websites + Google Places)',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'UUID v4 mall ID' },
      { name: 'name', type: 'TEXT', desc: 'Mall name (e.g. "Discovery Shopping Mall")', example: 'Discovery Shopping Mall' },
      { name: 'lat, lng', type: 'FLOAT8', desc: 'Mall centroid coordinates' },
      { name: 'kec, kab', type: 'TEXT', desc: 'Kecamatan + kabupaten' },
      { name: 'gla_m2', type: 'INT', desc: 'Gross Leasable Area in square meters', example: '58000' },
      { name: 'opened_year', type: 'INT', desc: 'Year mall opened', example: '1998' },
      { name: 'class', type: 'ENUM', desc: 'Mall class: A (premium mall), B (mid-tier), C (community mall)', example: 'A' },
      { name: 'visitor_estimate_daily', type: 'INT', desc: 'Estimated daily visitor count (from mall press releases + foot traffic models)', example: '18000' },
    ],
  },
  {
    name: 'brands',
    purpose: 'MAP/MAA brand portfolio metadata. One row = one brand.',
    row_count: '~80+ brands',
    source: 'MAP brand directory + MAA portfolio',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'Brand slug (e.g. starbucks, sports_station)', example: 'starbucks' },
      { name: 'name', type: 'TEXT', desc: 'Brand display name' },
      { name: 'parent', type: 'ENUM', desc: 'MAP or MAA' },
      { name: 'category', type: 'ENUM', desc: 'See stores.brand_category for values' },
      { name: 'origin_country', type: 'TEXT', desc: 'Country of origin (e.g. United States, Indonesia)', example: 'United States' },
      { name: 'format', type: 'TEXT', desc: 'Store format (e.g. cafe, kiosk, full-size, flagship)', example: 'cafe' },
      { name: 'location_preference', type: 'ENUM', desc: 'mall, street, or both — preferred location type for new outlets', example: 'mall' },
      { name: 'typical_size_m2', type: 'INT', desc: 'Typical store size in m²', example: '180' },
      { name: 'price_segment', type: 'ENUM', desc: 'mass, mid, premium, or luxury', example: 'premium' },
      { name: 'brand_strength', type: 'INT (1-10)', desc: 'Subjective brand pull score — used in scoring weight tuning', example: '9' },
    ],
  },
  {
    name: 'competitors',
    purpose: 'Competitor retail outlets (Indomaret, Alfamart, KFC, MCD, etc.). One row = one competitor outlet.',
    row_count: '~887+ outlets tracked',
    source: 'OSM Overpass API (daily cron)',
    columns: [
      { name: 'id', type: 'TEXT (PK)', desc: 'UUID v4 or OSM node ID' },
      { name: 'brand_name', type: 'TEXT', desc: 'Competitor brand (e.g. Indomaret, Alfamart, KFC, McDonald\'s)', example: 'Indomaret' },
      { name: 'brand_category', type: 'ENUM', desc: 'Same enum as stores.brand_category' },
      { name: 'name', type: 'TEXT', desc: 'Outlet name' },
      { name: 'lat, lng', type: 'FLOAT8', desc: 'Outlet coordinates', source: 'OSM node geometry' },
      { name: 'kec, kab', type: 'TEXT (nullable)', desc: 'Kecamatan + kabupaten (reverse-geocoded if missing from OSM)' },
      { name: 'is_in_mall', type: 'BOOLEAN (nullable)', desc: 'True if outlet is in a mall' },
      { name: 'address', type: 'TEXT (nullable)', desc: 'Street address (from OSM tags)' },
      { name: 'source', type: 'TEXT', desc: 'Data source: OSM, manual, csv_import, scrape', example: 'OSM' },
    ],
  },
  {
    name: 'opportunities (computed view)',
    purpose: 'Per-kelurahan opportunity score + market projections. Computed live from kelurahan × stores × competitors × malls. NOT a stored table.',
    row_count: '~709 rows (one per kelurahan)',
    source: 'Computed by /api/locinsight/opportunities endpoint',
    columns: [
      { name: 'kelurahan_id', type: 'TEXT (FK)', desc: 'Foreign key → kelurahan.id' },
      { name: 'kelurahan_name, kec_name, kab_name', type: 'TEXT', desc: 'Denormalized names for display' },
      { name: 'tier', type: 'INT (1-3)', desc: 'Economic tier' },
      { name: 'lat, lng', type: 'FLOAT8', desc: 'Kelurahan centroid' },
      { name: 'composite_score', type: 'INT (0-100)', desc: 'Weighted score across 6 factors. See formula below.', source: 'Computed', example: '72' },
      { name: 'recommendation', type: 'ENUM', desc: 'high_priority (≥70), priority (55-69), monitor (40-54), avoid (<40)', example: 'high_priority' },
      { name: 'factors', type: 'JSON', desc: 'Array of {name, weight, raw_value, weighted} for each of the 6 factors' },
      { name: 'potential_market_share', type: 'FLOAT (0-1)', desc: 'Huff Gravity Model market share fraction. See formula below.', example: '0.183' },
      { name: 'estimated_daily_customers', type: 'INT', desc: 'Daily customer estimate = market_share × (population × active_consumer_ratio × daily_visit_probability)', example: '412' },
      { name: 'projected_monthly_revenue_juta', type: 'FLOAT', desc: 'Monthly revenue in IDR juta (millions). GBR prediction or simplified (customers × avg_ticket × 30 days).', example: '386.4' },
      { name: 'nearest_mall_distance_km', type: 'FLOAT', desc: 'Haversine distance to nearest mall', example: '2.4' },
      { name: 'nearest_mall_name', type: 'TEXT (nullable)', desc: 'Nearest mall name' },
      { name: 'nearby_existing_stores', type: 'INT', desc: 'Count of MAP/MAA stores within 2 km radius', example: '3' },
      { name: 'cannibalization_risk', type: 'ENUM', desc: 'low (<2 nearby), medium (2-4), high (>4)', example: 'medium' },
      { name: 'white_space_summary', type: 'TEXT', desc: 'Human-readable summary of why this kelurahan scores high/low' },
    ],
  },
  {
    name: 'ab_tests',
    purpose: 'Saved A/B Simulator scenarios. One row = one saved scenario comparison.',
    row_count: 'Grows as users save scenarios',
    source: 'User-saved via A/B Simulator page',
    columns: [
      { name: 'id', type: 'UUID (PK)', desc: 'Auto-generated UUID v4' },
      { name: 'name', type: 'TEXT', desc: 'Scenario name (user-provided)', example: 'High Tourism Pivot' },
      { name: 'scenario_a', type: 'JSON', desc: 'Weight set A: {income, urban, tourist, transport, poi_density, competition}' },
      { name: 'scenario_b', type: 'JSON', desc: 'Weight set B' },
      { name: 'metrics', type: 'JSON', desc: 'Computed comparison metrics (rank_correlation, top_10_overlap, etc.)' },
      { name: 'winner', type: 'TEXT (nullable)', desc: 'User-marked winner: A, B, or null' },
      { name: 'created_by', type: 'TEXT', desc: 'Username or system', example: 'bayhaqy' },
      { name: 'created_at', type: 'TIMESTAMPTZ', desc: 'Creation timestamp' },
    ],
  },
]

// ============================================================================
// CALCULATIONS — formula definitions
// ============================================================================
interface CalcDef {
  name: string
  formula: string
  description: string
  inputs: string[]
  output: string
  example: string
}
const CALCULATIONS: CalcDef[] = [
  {
    name: 'Composite Score (0-100)',
    formula: 'score = Σ (factor_normalized × weight) × 100\n  where weights sum to 1.0 across 6 factors:\n    - income_index       (default weight: 0.20)\n    - urban_index        (default weight: 0.15)\n    - tourist_index      (default weight: 0.20)\n    - transport_index    (default weight: 0.10)\n    - poi_density_index  (default weight: 0.15)\n    - competition_gap    (default weight: 0.20)',
    description: 'The composite score is a weighted sum of 6 normalized factors, scaled to 0-100. Each factor is min-max normalized across all 709 kelurahan so that the best-scoring kelurahan gets 100 and the worst gets 0. Weights are tunable via the A/B Simulator.',
    inputs: ['kelurahan.income_index', 'kelurahan.urban_index', 'kelurahan.tourist_index', 'kelurahan.transport_index', 'kelurahan.poi_density_index', 'competitors (computed: 1 / (1 + competitor_count_within_2km))'],
    output: 'Integer 0-100. Higher = better expansion opportunity.',
    example: 'Kelurahan Dangin Puri Klod (Denpasar):\n  income_index=78.3 (norm 0.83), weight 0.20 → 0.166\n  urban_index=85.1 (norm 0.91), weight 0.15 → 0.137\n  tourist_index=42.0 (norm 0.45), weight 0.20 → 0.090\n  transport_index=67.8 (norm 0.72), weight 0.10 → 0.072\n  poi_density=54.2 (norm 0.58), weight 0.15 → 0.087\n  competition_gap=0.71 (norm 0.71), weight 0.20 → 0.142\n  Sum = 0.694 × 100 = 69.4 → rounded 69',
  },
  {
    name: 'Huff Gravity Model — Market Share',
    formula: 'P(i,j) = (A_j^α / D_ij^β) / Σ_k (A_k^α / D_ik^β)\n  where:\n    P(i,j) = probability customer in kelurahan i shops at store j\n    A_j    = attractiveness of store j (= brand_strength × typical_size_m2)\n    D_ij   = haversine distance (km) between kelurahan i centroid and store j\n    α      = attractiveness exponent (default 1.0)\n    β      = distance-decay exponent (default 2.0 — gravity inverse-square)',
    description: 'The Huff Model is the industry-standard probabilistic gravity model for retail market share. For each candidate site j and each kelurahan i in the catchment area, it computes the probability that a customer in i will choose j over all competing outlets k. Summing P(i,j) × population(i) gives the expected daily customer count for site j.',
    inputs: ['brands.brand_strength', 'brands.typical_size_m2', 'stores.lat,lng', 'competitors.lat,lng', 'kelurahan.lat,lng', 'kelurahan.population'],
    output: 'Float 0-1 representing market share fraction (e.g. 0.183 = 18.3% market share).',
    example: 'Candidate site Starbucks @ DSM, kelurahan Kuta:\n  A_starbucks = 9 × 180 = 1620\n  D_kuta_to_DSM = 1.2 km\n  Competitors within 5 km: 5 outlets with combined attractiveness 8200\n  P(Kuta, Starbucks_DSM) = (1620 / 1.2²) / (1620/1.2² + 8200/avg_D²)\n                          = 1125 / (1125 + 1845)\n                          = 0.379 (37.9%)',
  },
  {
    name: 'Est. Daily Customers',
    formula: 'customers = market_share × population × active_consumer_ratio × daily_visit_probability\n  where:\n    active_consumer_ratio   = 0.65 (65% of population are active shoppers)\n    daily_visit_probability = 0.012 (1.2% of active consumers visit a cafe/store daily)',
    description: 'Estimated daily customer count for a hypothetical new outlet at this kelurahan. Combines Huff Model market share with foot-traffic assumptions. The constants are calibrated from MAP internal POS data.',
    inputs: ['opportunities.potential_market_share', 'kelurahan.population'],
    output: 'Integer daily customer count.',
    example: 'Kelurahan Dangin Puri Klod (pop 12134, market_share 0.183):\n  0.183 × 12134 × 0.65 × 0.012 = 17.3 → ~17 customers/day\n  (Note: For tier-1 kelurahan with higher tourist_index, this scales up via tourist_index multiplier.)',
  },
  {
    name: 'Projected Monthly Revenue (Rp juta)',
    formula: 'revenue_juta = (estimated_daily_customers × avg_ticket_size × 30 days) / 1_000_000\n  where avg_ticket_size varies by brand category:\n    food_beverage:    Rp 45,000\n    sports:           Rp 350,000\n    fashion:          Rp 280,000\n    department_store: Rp 425,000\n    kids:             Rp 180,000\n    beauty:           Rp 220,000\n\nFor ML-predicted revenue, the GBR model replaces this linear formula.',
    description: 'Monthly revenue projection in IDR millions. Two modes: (1) Linear formula using category-specific avg ticket size; (2) Gradient-Boosted Regression (GBR) model trained on historical MAP store performance. The GBR mode is more accurate but requires the ML model to be trained.',
    inputs: ['opportunities.estimated_daily_customers', 'brands.category'],
    output: 'Float — monthly revenue in IDR juta (millions).',
    example: 'Kelurahan Dangin Puri Klod, food_beverage:\n  17 × 45000 × 30 / 1_000_000 = 22.95 juta/month',
  },
  {
    name: 'Cannibalization Risk',
    formula: 'risk = "low" if nearby_stores < 2\n       = "medium" if 2 ≤ nearby_stores ≤ 4\n       = "high" if nearby_stores > 4\n  where nearby_stores = count of MAP/MAA stores within 2 km haversine radius',
    description: 'Cannibalization risk measures how much a new store would eat into existing MAP/MAA outlets nearby. The Huff Model naturally captures cannibalization in the denominator (existing stores appear as competitors k), but this categorical label gives a quick visual cue.',
    inputs: ['stores.lat,lng', 'kelurahan.lat,lng'],
    output: 'Enum: low, medium, or high.',
    example: 'Kelurahan Kuta (5 MAP stores within 2 km) → high risk\nKelurahan Dangin Puri Klod (1 MAP store within 2 km) → low risk',
  },
  {
    name: 'Recommendation Tier',
    formula: 'recommendation = "high_priority" if composite_score ≥ 70\n                = "priority"      if 55 ≤ composite_score < 70\n                = "monitor"       if 40 ≤ composite_score < 55\n                = "avoid"         if composite_score < 40',
    description: 'Categorical bucketing of composite_score for quick filtering. Used by the Map Explorer, Opportunities, and Reports.',
    inputs: ['opportunities.composite_score'],
    output: 'Enum: high_priority, priority, monitor, avoid.',
    example: 'composite_score=72 → high_priority\ncomposite_score=58 → priority\ncomposite_score=45 → monitor\ncomposite_score=32 → avoid',
  },
  {
    name: 'Tier Classification (1/2/3)',
    formula: 'tier = 1 if kab_name in {Badung, Denpasar}      # Tier 1 — highest GDRP\n      = 2 if kab_name in {Tabanan, Gianyar, Buleleng}  # Tier 2\n      = 3 if kab_name in {Jembrana, Klungkung, Bangli, Karangasem}  # Tier 3',
    description: 'Economic tier of the kabupaten. Used to bucket expansion opportunities by market maturity. Tier 1 = highest GDRP per capita (Denpasar metro + Badung tourist corridor); Tier 2 = emerging urban; Tier 3 = rural / lower income.',
    inputs: ['kelurahan.kab_name'],
    output: 'Integer 1, 2, or 3.',
    example: 'kab_name="Badung" → tier 1\nkab_name="Tabanan" → tier 2\nkab_name="Bangli" → tier 3',
  },
]

// ============================================================================
// USER GUIDE — how-to for each menu
// ============================================================================
interface GuideItem {
  icon: any
  title: string
  desc: string
  steps: string[]
}
const USER_GUIDE: GuideItem[] = [
  {
    icon: BookOpen,
    title: 'Dashboard',
    desc: 'Executive overview with KPIs, top opportunities, and brand coverage summary.',
    steps: [
      'Open LocInsight — the Dashboard is the default landing page.',
      'Review the top KPIs: total kelurahan, total stores, total malls, high-priority count.',
      'Click any top-opportunity kelurahan to deep-dive into Analysis.',
      'Use the "Brand Coverage" widget to see where MAP/MAA has gaps by category.',
    ],
  },
  {
    icon: MapPin,
    title: 'Map Explorer',
    desc: 'Interactive map with choropleth (filled-area) visualization for opportunity + demographics, plus point layers for stores/malls/competitors/POIs.',
    steps: [
      'The Opportunity Score layer defaults to choropleth (filled color areas by kabupaten).',
      'Toggle layers on/off via the right-side Layers panel. When off, NO dots appear.',
      'Use the Filters card to filter Country → Province → Kabupaten → Kecamatan → Kelurahan. Filters apply to ALL layers.',
      'Double-click anywhere on the map to instantly analyze the nearest kelurahan.',
      'Click a kelurahan (in cells mode) or a kabupaten polygon (in choropleth mode) to select it.',
      'The Combined Indicators table at the bottom auto-filters to your selection.',
    ],
  },
  {
    icon: Table,
    title: 'Opportunities',
    desc: 'Ranked list of top expansion sites with full scoring breakdown.',
    steps: [
      'The Opportunities page lists all kelurahan sorted by composite_score (descending).',
      'Use the filters (tier, recommendation, kabupaten, score range) to narrow down.',
      'Click "View Details" on any row to open the Deep Analysis page.',
      'Export the filtered list as CSV using the Export button.',
    ],
  },
  {
    icon: Calculator,
    title: 'Deep Analysis',
    desc: 'Per-kelurahan deep dive with 6-factor breakdown, nearby outlets, and isochrones.',
    steps: [
      'Select a kelurahan from the dropdown or via the Map Explorer.',
      'Review the 6-factor radar chart — see which factors drive the score up/down.',
      'See nearby MAP/MAA stores, malls, and competitors within 2 km.',
      'Read the white-space summary for a plain-English explanation.',
      'Adjust scoring weights live via the A/B Simulator link.',
    ],
  },
  {
    icon: Shield,
    title: 'A/B Simulator',
    desc: 'Tune the 6 scoring weights live and compare rankings before/after.',
    steps: [
      'Open the A/B Simulator from the sidebar.',
      'Adjust the 6 weight sliders (income, urban, tourist, transport, poi_density, competition).',
      'See the top-10 ranking change in real-time as you tune.',
      'Click "Save Scenario" to persist the comparison for later review.',
    ],
  },
  {
    icon: Cpu,
    title: 'ML / AI Engine',
    desc: 'Gradient-Boosted Regression revenue predictor + AI chat assistant.',
    steps: [
      'Open ML/AI Engine from the sidebar.',
      'The "Predict" tab lets you input a hypothetical site (lat/lng + brand) and get a GBR revenue prediction.',
      'The "Train" tab runs a fresh training cycle on the latest data.',
      'The "AI Chat" floating button (bottom-right) gives you natural-language access to all insights.',
    ],
  },
]

// ============================================================================
// TECHNICAL DOCS — architecture, schema, API
// ============================================================================
const TECHNICAL_DOCS = [
  {
    icon: Server,
    title: 'System Architecture',
    body: `LocInsight is a serverless Next.js 16 application deployed on Vercel, with a
Supabase Postgres + PostGIS backend, and a Hugging Face Space hosting the
Python GBR ML model.

Frontend  → Next.js 16 (App Router) + React 19 + TypeScript 5
            Tailwind CSS 4 + shadcn/ui (Radix primitives)
            React-Leaflet 5 + Leaflet 1.9.4 for maps

Backend   → Next.js API Routes (serverless functions on Vercel)
            Prisma 6 ORM connecting to Supabase Postgres
            PostGIS extension for spatial queries (ST_Distance, ST_Within)

Database  → Supabase Postgres 15 + PostGIS 3.4
            8 entity tables: countries, provinces, kabupaten, kecamatan,
            kelurahan, brands, stores, malls, competitors, pois, mall_tenants,
            field_surveys, ab_tests

ML Engine → Python 3.11 + scikit-learn 1.4 (GradientBoostingRegressor)
            Hosted on Hugging Face Space (Bayhaqy/LocInsights_ml)
            Invoked via iframe + postMessage for in-browser predictions

Scoring   → Composite score computed in TypeScript (lib/scoring/engine.ts)
            Huff Gravity Model in TypeScript (lib/scoring/engine.ts)
            GBR model in Python (Hugging Face Space)

Deploy    → Vercel auto-deploy from main branch (github.com/bayhaqy/LocInsights)
            Preview deploys on PRs
            Production at https://locinsights.bayhaqy.my.id

Cron      → Vercel Cron (daily 03:00 UTC) calls /api/cron/anti-sleep
            + triggers OSM Overpass scraper for competitor refresh`,
  },
  {
    icon: Database,
    title: 'Database Schema (Prisma)',
    body: `The full Prisma schema is at prisma/schema.prisma. Key models:

model Kelurahan {
  id          String   @id          // BPS code, e.g. "5101011001"
  name        String
  kec_code    String                // FK → Kecamatan.code
  kab_code    String                // FK → Kabupaten.code
  tier        String                // "tier_1" | "tier_2" | "tier_3"
  lat         Float
  lng         Float
  population  Int
  area_km2    Float
  density     Float                 // computed: population / area_km2
  urban_index       Float           // 0-100
  income_index      Float           // 0-100
  tourist_index     Float           // 0-100
  transport_index   Float           // 0-100
  poi_density_index Float           // 0-100
  is_coastal  Boolean
  kecamatan   Kecamatan @relation(fields: [kec_code], references: [code])
  kabupaten   Kabupaten @relation(fields: [kab_code], references: [code])
}

model Store {
  id              String   @id @default(dbgenerated("(gen_random_uuid())::text"))
  brand_id        String                  // FK → Brand.id
  brand_name      String                  // denormalized
  brand_category  brand_category_enum
  parent          brand_parent_enum       // MAP | MAA
  name            String
  lat             Float
  lng             Float
  kec             String
  kab             String
  is_in_mall      Boolean   @default(false)
  mall_id         String?
  address         String
  opened_year     Int
  confirmed       Boolean   @default(false)
  brand           Brand     @relation(fields: [brand_id], references: [id])
}

Other models: Mall, Brand, Competitor, POI, MallTenant, FieldSurvey, ABTest.
All models use PostGIS geography type for lat/lng columns to enable
ST_DWithin / ST_Distance queries in meters.`,
  },
  {
    icon: GitBranch,
    title: 'API Endpoints',
    body: `All API routes live under /api/locinsight/* and return JSON:

GET  /api/locinsight/overview              → Dashboard data bundle (stats + top opps)
GET  /api/locinsight/opportunities         → Computed opportunities (with filters)
GET  /api/locinsight/kelurahan?all=true    → All 709 kelurahan
GET  /api/locinsight/stores                → All MAP/MAA stores
GET  /api/locinsight/malls                 → All Bali malls
GET  /api/locinsight/competitors?all=true  → All 887+ competitor outlets
GET  /api/locinsight/pois                  → All tourist + civic POIs
GET  /api/locinsight/brands                → All 80+ MAP/MAA brands
GET  /api/locinsight/analyze?id={kl_id}    → Per-kelurahan deep analysis
POST /api/locinsight/ab-test               → Save A/B scenario
POST /api/locinsight/ml/predict            → GBR revenue prediction
POST /api/locinsight/ml/train              → Trigger model training
POST /api/locinsight/chat                  → AI assistant (uses z-ai-web-dev-sdk)
POST /api/locinsight/scrape                → Trigger OSM Overpass scrape
GET  /api/cron/anti-sleep                  → Vercel cron keep-warm

Each GET endpoint supports ?all=true (returns all rows, no pagination),
?page=N&page_size=M (paginated), and filter query params.

Mutations (POST/PUT/DELETE) require the user to be logged in as superadmin
(see NextAuth section below).`,
  },
  {
    icon: Lock,
    title: 'Authentication & Roles (NextAuth, in progress)',
    body: `LocInsight uses NextAuth (Auth.js) for user authentication + role-based access.

ROLES:
  - superadmin  → Full access to ALL menus (including Data Manager, Scraper,
                  Settings, ML Train, A/B Simulator save). Default user: bayhaqy.
  - analyst     → Read-only access to Dashboard, Map, Opportunities, Analysis,
                  Reports, Methodology, About, Documentation. Cannot edit data.
  - viewer      → Same as analyst but no CSV export.

LOGIN:
  - Login page at /login (Username + Password form)
  - Credentials stored in NEXTAUTH_SECRET-hashed bcrypt hash
  - Session via JWT cookie (30-day expiry)

ROUTE PROTECTION:
  - middleware.ts checks session for /api/locinsight/* (POST/PUT/DELETE)
  - Client-side: NAV_ITEMS filtered by role in page.tsx
  - Server-side: API routes check session.role before mutation

PUBLIC ACCESS (no login required):
  - GET endpoints (read-only data)
  - Dashboard, Map, Opportunities, Analysis (read-only views)
  - Methodology, About, Documentation (info pages)

ADMIN-ONLY (login required):
  - Data Manager (CRUD on master data)
  - Data Scraper (OSM Overpass trigger)
  - ML/AI Engine → Train tab
  - Settings (AI config, map tiles)
  - A/B Simulator → Save Scenario

The superadmin "bayhaqy" account is created on first deployment via
NEXTAUTH_SUPERADMIN_USERNAME + NEXTAUTH_SUPERADMIN_PASSWORD env vars.`,
  },
  {
    icon: ScrollText,
    title: 'Roadmap — BPS 709 Kelurahan Shapefile Integration',
    body: `STATUS: In Progress (Aug 2026)

GOAL:
  Replace the current approximate kelurahan centroids (point-based) with
  real BPS kelurahan/desa administrative polygons for true choropleth
  visualization at the village level.

SOURCE:
  BPS publishes the kelurahan shapefile via the BPS Interactive Map portal
  (https://www.bps.go.id/id/interaktive-peta). The shapefile is also
  mirrored on BIG (Indonesian Geoportal) at https://www.big.go.id/.

INTEGRATION PLAN:
  1. Download BPS shapefile (gadm41_IDN_4_shp.zip, ~78 MB for all of Indonesia)
     Extract Bali-only features (filter by GID_1 = "Bali")
     Expected: 709 kelurahan/desa polygons for Bali

  2. Convert to GeoJSON + simplify (using mapshaper -simplify dp 10%)
     Target file size: ~3-5 MB (vs ~50 MB raw)
     Save to: /public/geojson/bali-kelurahan.geojson

  3. Update ChoroplethLayer + ChoroplethDemographicsLayer to support
     'kelurahan' granularity by loading bali-kelurahan.geojson

  4. Replace the current "cells" mode (quantile-colored CircleMarkers at
     kelurahan centroids) with true polygon choropleth for kelurahan level

  5. Validate: ensure all 709 BPS kelurahan codes match our kelurahan.id
     format (kab_code + kec_code + kel_code = 10 digits)

EXPECTED COMPLETION: Q4 2026

WHY THIS MATTERS:
  Currently, kelurahan-level choropleth uses small colored circles at
  each village centroid — visually OK but not a true filled-area
  choropleth. With real BPS polygons, the map will show contiguous
  colored regions like a Felt.com / Placer.ai professional dashboard,
  which is what management expects for credibility validation.`,
  },
]

// ============================================================================
// Markdown renderer — minimal, no external deps
// Supports: #/##/### headings, **bold**, *italic*, `code`, ```code blocks```,
// - bullet lists, 1. numbered lists, > blockquote, --- hr, [text](url) links,
// | tables |, and paragraphs.
// ============================================================================
function renderMarkdown(md: string): string {
  if (!md) return '<p class="text-[var(--brand-ink)]/40 italic">Nothing to preview yet. Type markdown on the left.</p>'

  const lines = md.split('\n')
  let html = ''
  let inCodeBlock = false
  let codeBuffer: string[] = []
  let inTable = false
  let tableRows: string[][] = []
  let listType: 'ul' | 'ol' | null = null

  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const inline = (s: string) => {
    let out = escapeHtml(s)
    // Inline code
    out = out.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-[var(--brand-cream)] rounded text-[12px] font-mono text-[var(--brand-red)]">$1</code>')
    // Bold
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic (avoid matching bold's **)
    out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    // Links [text](url)
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--brand-red)] hover:underline">$1</a>')
    return out
  }

  const flushList = () => {
    if (listType && listType !== null) {
      html += `</${listType}>`
      listType = null
    }
  }
  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      const [header, ...body] = tableRows
      html += '<div class="overflow-x-auto my-3"><table class="min-w-full text-[12px] border-collapse border border-[var(--brand-border)] rounded">'
      html += '<thead><tr>' + header.map(c => `<th class="border border-[var(--brand-border)] px-2 py-1.5 bg-[var(--brand-cream)] text-left font-semibold text-[var(--brand-ink)]">${inline(c)}</th>`).join('') + '</tr></thead>'
      if (body.length > 0) {
        html += '<tbody>' + body.map(r => '<tr>' + r.map(c => `<td class="border border-[var(--brand-border)] px-2 py-1.5 text-[var(--brand-ink)]/85">${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody>'
      }
      html += '</table></div>'
      tableRows = []
      inTable = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block fence
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        flushList()
        flushTable()
        inCodeBlock = true
        codeBuffer = []
      } else {
        html += `<pre class="bg-[var(--brand-ink)] text-white/90 text-[12px] font-mono p-3 rounded-md overflow-x-auto my-3 leading-relaxed"><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`
        inCodeBlock = false
        codeBuffer = []
      }
      continue
    }
    if (inCodeBlock) {
      codeBuffer.push(line)
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushList()
      flushTable()
      const level = headingMatch[1].length
      const text = inline(headingMatch[2])
      const sizes = ['text-[20px] font-bold mt-4 mb-2', 'text-[16px] font-bold mt-3 mb-1.5', 'text-[14px] font-semibold mt-2 mb-1', 'text-[13px] font-semibold mt-2 mb-1', 'text-[12px] font-semibold mt-1 mb-0.5', 'text-[11px] font-semibold mt-1 mb-0.5']
      html += `<h${level} class="${sizes[level - 1]} text-[var(--brand-ink)] leading-tight">${text}</h${level}>`
      continue
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line) || /^\*\*\*+\s*$/.test(line)) {
      flushList()
      flushTable()
      html += '<hr class="my-3 border-[var(--brand-border)]" />'
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList()
      flushTable()
      html += `<blockquote class="border-l-4 border-[var(--brand-red)]/40 pl-3 py-1 my-2 text-[12.5px] text-[var(--brand-ink)]/80 italic bg-[var(--brand-cream)]/50 rounded-r">${inline(line.slice(2))}</blockquote>`
      continue
    }

    // Table row
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushList()
      const cells = line.trim().slice(1, -1).split('|').map(c => c.trim())
      // Skip separator row (|---|---|)
      if (cells.every(c => /^:?-+:?$/.test(c))) continue
      inTable = true
      tableRows.push(cells)
      continue
    } else {
      flushTable()
    }

    // Bullet list
    if (/^\s*[-*+]\s+.+/.test(line)) {
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
        html += '<ul class="list-disc pl-5 my-2 space-y-1 text-[13px] text-[var(--brand-ink)]/85">'
      }
      html += `<li>${inline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`
      continue
    }

    // Numbered list
    if (/^\s*\d+\.\s+.+/.test(line)) {
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
        html += '<ol class="list-decimal pl-5 my-2 space-y-1 text-[13px] text-[var(--brand-ink)]/85">'
      }
      html += `<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`
      continue
    }

    // Empty line — flush list, paragraph break
    if (line.trim() === '') {
      flushList()
      continue
    }

    // Regular paragraph
    flushList()
    html += `<p class="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed my-2">${inline(line)}</p>`
  }

  // Flush any remaining state
  if (inCodeBlock && codeBuffer.length > 0) {
    html += `<pre class="bg-[var(--brand-ink)] text-white/90 text-[12px] font-mono p-3 rounded-md overflow-x-auto my-3"><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`
  }
  flushList()
  flushTable()

  return html
}

// ============================================================================
// LocalStorage helpers for the editable markdown notes
// ============================================================================
const DOCS_KEY = 'locinsight.docs.customNotes'
const DOCS_TITLES_KEY = 'locinsight.docs.customNotes.titles'

interface SavedNote {
  id: string
  title: string
  content: string
  updated_at: number
}

function loadNotes(): SavedNote[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(DOCS_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch { return [] }
}

function saveNotes(notes: SavedNote[]) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(DOCS_KEY, JSON.stringify(notes)) } catch {}
}

// ============================================================================
// Documentation component
// ============================================================================
export function Documentation() {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set([0]))
  const [expandedTables, setExpandedTables] = useState<Set<number>>(new Set([0]))

  // Custom notes editor state
  const [notes, setNotes] = useState<SavedNote[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')

  // Load notes on mount
  useEffect(() => {
    const loaded = loadNotes()
    setNotes(loaded)
    if (loaded.length > 0) {
      setActiveNoteId(loaded[0].id)
      setDraftTitle(loaded[0].title)
      setDraftContent(loaded[0].content)
    } else {
      // Seed with a starter note
      const starter: SavedNote = {
        id: 'starter-' + Date.now(),
        title: 'Getting Started — Markdown Reference',
        content: `# Welcome to LocInsight Documentation Notes

This is your **editable markdown scratchpad**. Use it to write:

- Meeting notes
- Custom analyses
- Reports to share with management
- Methodology variations

## Markdown Reference

### Headings
Use \`#\` for h1, \`##\` for h2, \`###\` for h3.

### Emphasis
**Bold** with double asterisks.
*Italic* with single asterisks.
\`Inline code\` with backticks.

### Lists
- Bullet item 1
- Bullet item 2

1. Numbered item 1
2. Numbered item 2

### Tables
| Column A | Column B | Column C |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

### Code Blocks
\`\`\`typescript
function calculateScore(weights: number[]): number {
  return weights.reduce((sum, w) => sum + w, 0)
}
\`\`\`

### Links
[Visit bayhaqy.my.id](https://bayhaqy.my.id)

### Blockquotes
> This is a blockquote — useful for callouts and citations.

---

Click **Save** to persist this note to your browser's localStorage.
Edits survive page reloads.`,
        updated_at: Date.now(),
      }
      setNotes([starter])
      setActiveNoteId(starter.id)
      setDraftTitle(starter.title)
      setDraftContent(starter.content)
      saveNotes([starter])
    }
  }, [])

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) || null, [notes, activeNoteId])

  const handleSaveNote = useCallback(() => {
    if (!activeNoteId) return
    const updated = notes.map(n =>
      n.id === activeNoteId ? { ...n, title: draftTitle, content: draftContent, updated_at: Date.now() } : n
    )
    setNotes(updated)
    saveNotes(updated)
  }, [activeNoteId, notes, draftTitle, draftContent])

  const handleNewNote = useCallback(() => {
    const newNote: SavedNote = {
      id: 'note-' + Date.now(),
      title: 'Untitled Note',
      content: '# New Note\n\nStart writing...',
      updated_at: Date.now(),
    }
    const updated = [...notes, newNote]
    setNotes(updated)
    saveNotes(updated)
    setActiveNoteId(newNote.id)
    setDraftTitle(newNote.title)
    setDraftContent(newNote.content)
  }, [notes])

  const handleDeleteNote = useCallback((id: string) => {
    if (!confirm('Delete this note? This cannot be undone.')) return
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    saveNotes(updated)
    if (activeNoteId === id) {
      if (updated.length > 0) {
        setActiveNoteId(updated[0].id)
        setDraftTitle(updated[0].title)
        setDraftContent(updated[0].content)
      } else {
        setActiveNoteId(null)
        setDraftTitle('')
        setDraftContent('')
      }
    }
  }, [notes, activeNoteId])

  const handleSelectNote = useCallback((id: string) => {
    const note = notes.find(n => n.id === id)
    if (!note) return
    setActiveNoteId(id)
    setDraftTitle(note.title)
    setDraftContent(note.content)
  }, [notes])

  const toggleSource = (i: number) => {
    const next = new Set(expandedSources)
    if (next.has(i)) next.delete(i); else next.add(i)
    setExpandedSources(next)
  }
  const toggleTable = (i: number) => {
    const next = new Set(expandedTables)
    if (next.has(i)) next.delete(i); else next.add(i)
    setExpandedTables(next)
  }

  // Filter sources/tables by search
  const filteredSources = useMemo(() => {
    if (!search) return DATA_SOURCES
    const q = search.toLowerCase()
    return DATA_SOURCES.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q) ||
      s.urls.some(u => u.label.toLowerCase().includes(q) || u.href.toLowerCase().includes(q))
    )
  }, [search])

  const filteredTables = useMemo(() => {
    if (!search) return DATA_DICTIONARY
    const q = search.toLowerCase()
    return DATA_DICTIONARY.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.purpose.toLowerCase().includes(q) ||
      t.columns.some(c => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q))
    )
  }, [search])

  const previewHtml = useMemo(() => renderMarkdown(draftContent), [draftContent])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          Documentation
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          Complete user + technical documentation, data source provenance, data dictionary, and editable markdown notes.
        </p>
      </div>

      <Tabs defaultValue="sources" className="w-full">
        <TabsList className="bg-white border border-[var(--brand-border)] grid grid-cols-5 h-auto p-1 rounded-md">
          <TabsTrigger value="sources" className="text-[11px] data-[state=active]:bg-[var(--brand-red)] data-[state=active]:text-white">
            <Database className="w-3 h-3 mr-1" /> Data Sources
          </TabsTrigger>
          <TabsTrigger value="dictionary" className="text-[11px] data-[state=active]:bg-[var(--brand-red)] data-[state=active]:text-white">
            <Table className="w-3 h-3 mr-1" /> Data Dictionary
          </TabsTrigger>
          <TabsTrigger value="user-guide" className="text-[11px] data-[state=active]:bg-[var(--brand-red)] data-[state=active]:text-white">
            <BookOpen className="w-3 h-3 mr-1" /> User Guide
          </TabsTrigger>
          <TabsTrigger value="technical" className="text-[11px] data-[state=active]:bg-[var(--brand-red)] data-[state=active]:text-white">
            <Code className="w-3 h-3 mr-1" /> Technical
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-[11px] data-[state=active]:bg-[var(--brand-red)] data-[state=active]:text-white">
            <Edit3 className="w-3 h-3 mr-1" /> My Notes
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* DATA SOURCES TAB */}
        {/* ============================================ */}
        <TabsContent value="sources" className="mt-4 space-y-4">
          <Card className="card-premium">
            <CardContent className="p-4 flex items-center gap-3">
              <Search className="w-4 h-4 text-[var(--brand-ink)]/40 flex-shrink-0" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search data sources by name, category, URL..."
                className="h-9 text-[12px] border-0 shadow-none focus-visible:ring-0"
              />
              <Badge variant="outline" className="text-[10px] flex-shrink-0">
                {filteredSources.length} of {DATA_SOURCES.length} sources
              </Badge>
            </CardContent>
          </Card>

          {filteredSources.map((src, i) => {
            const isExpanded = expandedSources.has(DATA_SOURCES.indexOf(src))
            return (
              <Card key={i} className="card-premium">
                <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleSource(DATA_SOURCES.indexOf(src))}>
                  <CardTitle className="text-[13px] flex items-start gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--brand-red)] mt-0.5 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-[var(--brand-red)] mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="uppercase tracking-wider">{src.title}</span>
                        <Badge variant="outline" className="text-[9px] border-[var(--brand-red)]/30 text-[var(--brand-red)]">{src.category}</Badge>
                      </div>
                      <p className="text-[11.5px] text-[var(--brand-ink)]/60 font-normal mt-1 leading-snug normal-case tracking-normal">{src.desc}</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11.5px]">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/50 font-semibold mb-0.5">License</div>
                        <div className="text-[var(--brand-ink)]/85">{src.license}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/50 font-semibold mb-0.5">Update Frequency</div>
                        <div className="text-[var(--brand-ink)]/85">{src.update_freq}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/50 font-semibold mb-1.5">Source Links (click to validate)</div>
                      <div className="space-y-1">
                        {src.urls.map((u, j) => (
                          <a
                            key={j}
                            href={u.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[11.5px] font-medium text-[var(--brand-red)] hover:text-[var(--brand-red-dark)] hover:underline group"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                            <span className="truncate">{u.label}</span>
                            <span className="text-[var(--brand-ink)]/40 font-mono text-[10px] truncate hidden md:inline">{u.href.replace(/^https?:\/\//, '')}</span>
                          </a>
                        ))}
                      </div>
                    </div>

                    {src.files.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/50 font-semibold mb-1.5">Raw Files (download)</div>
                        <div className="space-y-1">
                          {src.files.map((f, j) => (
                            <a
                              key={j}
                              href={f.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-[11.5px] font-medium text-[var(--brand-ink)] hover:text-[var(--brand-red)] hover:underline group"
                            >
                              <HardDrive className="w-3 h-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                              <span className="truncate">{f.label}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </TabsContent>

        {/* ============================================ */}
        {/* DATA DICTIONARY TAB */}
        {/* ============================================ */}
        <TabsContent value="dictionary" className="mt-4 space-y-4">
          <Card className="card-premium">
            <CardContent className="p-4 flex items-center gap-3">
              <Search className="w-4 h-4 text-[var(--brand-ink)]/40 flex-shrink-0" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tables or columns..."
                className="h-9 text-[12px] border-0 shadow-none focus-visible:ring-0"
              />
              <Badge variant="outline" className="text-[10px] flex-shrink-0">
                {filteredTables.length} of {DATA_DICTIONARY.length} tables
              </Badge>
            </CardContent>
          </Card>

          {/* Calculations card — at top of dictionary */}
          <Card className="card-premium border-[var(--brand-red)]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-[13px] uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[var(--brand-red)]" />
                Calculations & Formulas
                <Badge variant="outline" className="text-[9px] ml-2 border-[var(--brand-red)]/30 text-[var(--brand-red)]">{CALCULATIONS.length} formulas</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <p className="text-[12px] text-[var(--brand-ink)]/70 leading-relaxed">
                Each metric below is computed live from the raw data tables. The formula, inputs, and a worked example are provided so analysts can audit any number.
              </p>
              {CALCULATIONS.map((calc, i) => (
                <div key={i} className="border border-[var(--brand-border)] rounded-md p-3 bg-white">
                  <div className="text-[13px] font-bold text-[var(--brand-ink)] mb-1.5">{calc.name}</div>
                  <pre className="bg-[var(--brand-ink)] text-white/90 text-[11px] font-mono p-2.5 rounded-md overflow-x-auto my-2 leading-relaxed whitespace-pre-wrap">{calc.formula}</pre>
                  <p className="text-[12px] text-[var(--brand-ink)]/80 leading-relaxed mb-2">{calc.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-[var(--brand-ink)]/50 font-semibold mb-0.5">Inputs</div>
                      <ul className="space-y-0.5">
                        {calc.inputs.map((inp, j) => (
                          <li key={j} className="text-[var(--brand-ink)]/85 font-mono text-[10.5px]">{inp}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-[var(--brand-ink)]/50 font-semibold mb-0.5">Output</div>
                      <div className="text-[var(--brand-ink)]/85">{calc.output}</div>
                    </div>
                  </div>
                  <details className="mt-2 group">
                    <summary className="text-[11px] text-[var(--brand-red)] cursor-pointer hover:underline flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 group-open:hidden" />
                      <ChevronDown className="w-3 h-3 hidden group-open:inline" />
                      Worked Example
                    </summary>
                    <pre className="bg-[var(--brand-cream)] text-[var(--brand-ink)]/85 text-[11px] font-mono p-2.5 rounded-md mt-2 overflow-x-auto whitespace-pre-wrap leading-relaxed">{calc.example}</pre>
                  </details>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Table definitions */}
          {filteredTables.map((tbl, i) => {
            const isExpanded = expandedTables.has(DATA_DICTIONARY.indexOf(tbl))
            return (
              <Card key={i} className="card-premium">
                <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleTable(DATA_DICTIONARY.indexOf(tbl))}>
                  <CardTitle className="text-[13px] flex items-start gap-2">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--brand-red)] mt-0.5 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-[var(--brand-red)] mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono text-[var(--brand-red)] font-bold text-[13px]">{tbl.name}</code>
                        {tbl.row_count && <Badge variant="outline" className="text-[9px] border-[var(--brand-ink)]/30 text-[var(--brand-ink)]/70">{tbl.row_count}</Badge>}
                      </div>
                      <p className="text-[11.5px] text-[var(--brand-ink)]/60 font-normal mt-1 leading-snug">{tbl.purpose}</p>
                      <div className="text-[10px] text-[var(--brand-ink)]/50 font-mono mt-1">Source: {tbl.source}</div>
                    </div>
                  </CardTitle>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-[11.5px] border-collapse">
                        <thead>
                          <tr className="bg-[var(--brand-cream)]">
                            <th className="border border-[var(--brand-border)] px-2 py-1.5 text-left font-semibold text-[var(--brand-ink)]">Column</th>
                            <th className="border border-[var(--brand-border)] px-2 py-1.5 text-left font-semibold text-[var(--brand-ink)] w-32">Type</th>
                            <th className="border border-[var(--brand-border)] px-2 py-1.5 text-left font-semibold text-[var(--brand-ink)]">Description</th>
                            <th className="border border-[var(--brand-border)] px-2 py-1.5 text-left font-semibold text-[var(--brand-ink)] w-32">Source</th>
                            <th className="border border-[var(--brand-border)] px-2 py-1.5 text-left font-semibold text-[var(--brand-ink)] w-32">Example</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tbl.columns.map((col, j) => (
                            <tr key={j} className="hover:bg-[var(--brand-cream)]/50">
                              <td className="border border-[var(--brand-border)] px-2 py-1.5 font-mono font-semibold text-[var(--brand-red)] whitespace-nowrap">{col.name}</td>
                              <td className="border border-[var(--brand-border)] px-2 py-1.5 font-mono text-[var(--brand-ink)]/70 text-[10.5px]">{col.type}</td>
                              <td className="border border-[var(--brand-border)] px-2 py-1.5 text-[var(--brand-ink)]/85 leading-snug">{col.desc}</td>
                              <td className="border border-[var(--brand-border)] px-2 py-1.5 text-[var(--brand-ink)]/70 text-[10.5px]">{col.source || '—'}</td>
                              <td className="border border-[var(--brand-border)] px-2 py-1.5 font-mono text-[var(--brand-ink)]/70 text-[10.5px]">{col.example || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </TabsContent>

        {/* ============================================ */}
        {/* USER GUIDE TAB */}
        {/* ============================================ */}
        <TabsContent value="user-guide" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {USER_GUIDE.map((g, i) => {
              const Icon = g.icon
              return (
                <Card key={i} className="card-premium">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[13px] flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[var(--brand-red)]" />
                      {g.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-[12px] text-[var(--brand-ink)]/70 leading-relaxed mb-2">{g.desc}</p>
                    <ol className="list-decimal pl-5 space-y-1 text-[11.5px] text-[var(--brand-ink)]/85">
                      {g.steps.map((s, j) => <li key={j} className="leading-snug">{s}</li>)}
                    </ol>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ============================================ */}
        {/* TECHNICAL DOCS TAB */}
        {/* ============================================ */}
        <TabsContent value="technical" className="mt-4 space-y-4">
          {TECHNICAL_DOCS.map((doc, i) => {
            const Icon = doc.icon
            return (
              <Card key={i} className="card-premium">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[13px] uppercase tracking-wider flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[var(--brand-red)]" />
                    {doc.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <pre
                    className="text-[12px] font-mono text-[var(--brand-ink)]/85 leading-relaxed whitespace-pre-wrap bg-[var(--brand-cream)]/50 p-3 rounded-md overflow-x-auto"
                  >{doc.body}</pre>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* ============================================ */}
        {/* MY NOTES TAB — editable markdown with live preview */}
        {/* ============================================ */}
        <TabsContent value="notes" className="mt-4 space-y-4">
          <Card className="card-premium border-[var(--brand-red)]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-[13px] uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[var(--brand-red)]" />
                Editable Markdown Notes
                <span className="ml-auto text-[10px] normal-case tracking-normal text-[var(--brand-ink)]/50 font-normal">
                  Saved to your browser (localStorage)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* Notes list + actions */}
              <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-[var(--brand-border)]">
                <Select value={activeNoteId || ''} onValueChange={handleSelectNote}>
                  <SelectTrigger className="h-8 text-[12px] min-w-[200px] flex-1">
                    <SelectValue placeholder="Select note..." />
                  </SelectTrigger>
                  <SelectContent>
                    {notes.map(n => (
                      <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={handleNewNote} className="h-8 text-[11px]">
                  <FileText className="w-3 h-3 mr-1" /> New Note
                </Button>
                <Button size="sm" onClick={handleSaveNote} className="h-8 text-[11px] bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]">
                  <Save className="w-3 h-3 mr-1" /> Save
                </Button>
                {activeNoteId && (
                  <Button size="sm" variant="outline" onClick={() => handleDeleteNote(activeNoteId)} className="h-8 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                )}
                {/* Editor mode toggle */}
                <div className="flex items-center gap-1 ml-auto bg-[var(--brand-cream)] rounded-md p-0.5">
                  {(['edit', 'split', 'preview'] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setEditorMode(mode)}
                      className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded transition-colors ${editorMode === mode ? 'bg-[var(--brand-red)] text-white' : 'text-[var(--brand-ink)]/70 hover:bg-white'}`}
                    >
                      {mode === 'edit' && <Edit3 className="w-2.5 h-2.5 inline mr-0.5" />}
                      {mode === 'split' && <ChevronRight className="w-2.5 h-2.5 inline mr-0.5" />}
                      {mode === 'preview' && <Eye className="w-2.5 h-2.5 inline mr-0.5" />}
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title input */}
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Note title..."
                className="h-9 text-[14px] font-semibold"
              />

              {/* Editor + Preview */}
              <div className={`grid gap-3 ${editorMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {editorMode !== 'preview' && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/50 mb-1.5 block flex items-center gap-1">
                      <Edit3 className="w-3 h-3" /> Markdown Source
                    </Label>
                    <Textarea
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      placeholder="Type markdown here... Use # for headings, **bold**, *italic*, `code`, - for lists, [text](url) for links, | tables |"
                      className="font-mono text-[12px] min-h-[500px] resize-y leading-relaxed"
                      spellCheck={false}
                    />
                  </div>
                )}
                {editorMode !== 'edit' && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/50 mb-1.5 block flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Rendered Preview
                    </Label>
                    <div
                      className="bg-white border border-[var(--brand-border)] rounded-md p-4 min-h-[500px] max-h-[700px] overflow-y-auto scroll-styled prose-sm"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  </div>
                )}
              </div>

              {/* Last saved indicator */}
              {activeNote && (
                <div className="text-[10px] text-[var(--brand-ink)]/50 text-right">
                  Last saved: {new Date(activeNote.updated_at).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
