# Data Model

> Schema explanation for the LocInsight PostgreSQL database (Supabase).
> For the formal schema, see [`prisma/schema.prisma`](../prisma/schema.prisma)
> in this repo, or the SQL migrations in the
> [`Locinsights_db`](https://github.com/bayhaqy/Locinsights_db) repo.

## Entity-relationship diagram

```
                       ┌─────────────┐
                       │  countries  │
                       └──────┬──────┘
                              │ 1:N
                       ┌──────▼──────┐
                       │  provinces  │
                       └──────┬──────┘
                              │ 1:N
                       ┌──────▼──────┐
                       │  kabupaten  │ ← admin_tier_enum (1/2/3)
                       └──────┬──────┘
                              │ 1:N
                       ┌──────▼──────┐
                       │  kecamatan  │
                       └──────┬──────┘
                              │ 1:N
                       ┌──────▼──────┐
                       │  kelurahan  │ ← 172 records in Bali
                       └─────────────┘

  ┌──────────┐         ┌──────────────┐         ┌──────────────┐
  │  brands  │◄────────│   stores     │────────►│    malls     │
  │ (27 MAA) │  N:1    │ (master MAA) │  N:1    │              │
  └──────────┘         └──────────────┘         └──────┬───────┘
                                                     │ 1:N
                                              ┌──────▼───────┐
                                              │ mall_tenants │
                                              └──────────────┘

  ┌────────────────────┐    ┌──────┐    ┌──────┐
  │ competitor_stores  │    │ pois │    │ ab_  │
  │ (separate — never  │    │      │    │ tests│
  │  mixed with stores)│    │      │    │      │
  └────────────────────┘    └──────┘    └──────┘

  ┌─────────────────────┐   ┌─────────────────┐   ┌─────────────────┐
  │ staging_stores      │   │  ml_models      │   │ training_runs   │
  │ staging_competitors │   │  predictions    │   │                 │
  │ staging_malls       │   │                 │   │                 │
  └─────────────────────┘   └─────────────────┘   └─────────────────┘

  ┌──────────────┐   ┌───────────────┐   ┌─────────────┐
  │ field_surveys│   │ scraper_runs  │   │  reports    │
  └──────────────┘   └───────────────┘   └─────────────┘
```

## Tables (16 total)

### Master data — public read (RLS anon)

| Table | Purpose | Key fields |
|---|---|---|
| `countries` | Top-level admin | `id`, `name`, `iso2`, `iso3` |
| `provinces` | Indonesian provinces | `code`, `name`, `country` |
| `kabupaten` | 9 Bali kabupaten/kota | `code`, `name`, `type` (Kabupaten/Kota), `tier` (1/2/3), `population_2024`, `gdrp_per_capita_juta` |
| `kecamatan` | 48 Bali kecamatan | `code`, `name`, `kabupaten_code`, `urban_score` |
| `kelurahan` | 172 Bali kelurahan | `id`, `code`, `name`, `kec_code`, `kab_code`, `lat`, `lng`, `population`, `area_km2`, `is_coastal` |
| `brands` | 27 MAA/MAP portfolio brands | `id`, `name`, `parent` (MAP/MAA), `category`, `price_segment`, `brand_strength` |
| `stores` | Master MAA/MAP stores | `id`, `brand_id`, `name`, `lat`, `lng`, `kec`, `kab`, `is_in_mall`, `mall_id`, `confirmed` |
| `competitor_stores` | Competitor stores (separate!) | `id`, `brand_name`, `brand_category`, `name`, `lat`, `lng`, `kec`, `kab`, `is_in_mall`, `mall_id` |
| `malls` | Bali malls | `id`, `name`, `lat`, `lng`, `gla_m2`, `opened_year`, `class` |
| `mall_tenants` | Mall tenant directory | `id`, `mall_id`, `mall_name`, `brand_name`, `brand_category`, `is_map_brand`, `is_competitor` |
| `pois` | Points of interest | `id`, `name`, `lat`, `lng`, `poi_type`, `magnitude` |

### ML / Analytics — public read (RLS anon)

| Table | Purpose |
|---|---|
| `ml_models` | Model registry (Huff, KMeans, GBR) |
| `training_runs` | Audit history of GBR training runs |
| `predictions` | Cached kelurahan-level predictions |
| `ab_tests` | A/B site comparison scenarios |

### Staging (scraper review) — service_role only

| Table | Purpose |
|---|---|
| `staging_stores` | Scraper output for stores — pending review |
| `staging_competitors` | Scraper output for competitors — pending review |
| `staging_malls` | Scraper output for malls — pending review |

Each staging table has: `batch_id`, `review_status` (pending/approved/rejected/merged),
`reviewer`, `reviewer_notes`, `reviewed_at`, `merged_to` (FK to the master row
after merge), `quality_issues` (JSON array), `is_duplicate` (bool).

### Operations — service_role only (mostly)

| Table | Purpose |
|---|---|
| `field_surveys` | PWA-submitted field surveys (anon can INSERT only) |
| `scraper_runs` | Audit log of every scrape (query, source, found_count, saved_count) |
| `reports` | Saved report configurations (for re-running) |

## Why stores and competitor_stores are separate

The v1 design tried to put everything in one `stores` table with a `parent`
enum (`MAA` / `MAP` / `COMPETITOR`). This caused three problems:

1. **Schema drift** — competitor rows had different required fields than MAA
   rows (e.g., no `brand_id` FK, no `opened_year`). The single-table design
   ended up with lots of NULLs and unclear validation.
2. **Query confusion** — every dashboard query had to remember to filter
   `WHERE parent IN ('MAA', 'MAP')` to exclude competitors. Easy to forget,
   caused incorrect KPIs.
3. **Scraper pollution** — when a scraped brand didn't match the MAA catalog,
   it got inserted with `brand_id='BR_SCRAPER'` and `parent='COMPETITOR'`,
   polluting the master table with thousands of low-quality rows.

The v2/v3 design fixes this by using **two separate tables**:

- `stores` — only MAA/MAP portfolio brands. Has a FK to `brands.id`. Strict
  validation, no scraper pollution possible.
- `competitor_stores` — any non-MAA brand. No FK to `brands`. Looser
  validation (we don't know all competitor brand IDs upfront).

The `brand-classifier.ts` module enforces this routing during scraping.

## Enums

| Enum | Values |
|---|---|
| `brand_parent_enum` | `MAA`, `MAP` |
| `brand_category_enum` | `sports`, `fashion`, `food_beverage`, `department_store`, `kids`, `lifestyle`, `beauty`, `athleisure`, `footwear` |
| `brand_price_segment_enum` | `budget`, `mid`, `premium`, `luxury` |
| `location_format_enum` | `mall`, `street`, `both` |
| `competitor_category_enum` | `convenience_store`, `fast_food`, `coffee`, `fashion`, `beauty`, `supermarket`, `pharmacy`, `department_store`, `sports`, `other` |
| `admin_tier_enum` | `1` (urban), `2` (suburban), `3` (rural) |
| `admin_type_enum` | `Kabupaten`, `Kota` |
| `scraper_source_enum` | `osm`, `nominatim`, `manual`, `field_survey`, `bulk_import` |
| `approval_status_enum` | `pending`, `approved`, `rejected`, `merged` |
| `review_status_enum` | `pending`, `approved`, `rejected`, `imported` |
| `survey_type_enum` | `site_visit`, `competitor_audit`, `mall_audit`, `market_observation` |
| `traffic_enum` | `low`, `medium`, `high`, `very_high` |
| `outlet_condition_enum` | `excellent`, `good`, `fair`, `poor`, `closed` |
| `ml_algorithm_enum` | `gbr_regressor`, `huff_gravity`, `kmeans` |
| `ml_model_type_enum` | `site_scoring`, `revenue_forecast`, `cluster` |
| `ml_model_status_enum` | `experimental`, `active`, `deprecated` |
| `training_status_enum` | `pending`, `running`, `completed`, `failed` |

## Spatial columns

Every spatial table has both `lat`/`lng` (Float) and `geom` (PostGIS
`geography(point, 4326)`) columns. The `geom` is auto-generated from
`lat`/`lng` via:

```sql
geom geography(point, 4326) GENERATED ALWAYS AS (ST_MakePoint(lng, lat)::geography) STORED
```

This enables efficient spatial queries:

```sql
-- All stores within 5 km of a candidate site
SELECT * FROM stores
WHERE ST_DWithin(geom, ST_MakePoint(115.17, -8.72)::geography, 5000);

-- Competitor density within 1 km of each kelurahan centroid
SELECT k.id, COUNT(c.*) AS competitors_within_1km
FROM kelurahan k
LEFT JOIN competitor_stores c
  ON ST_DWithin(k.geom, c.geom, 1000)
GROUP BY k.id;
```

## Anti-ocean CHECK constraint

All `stores`, `pois`, and `competitor_stores` tables have:

```sql
CHECK (is_on_bali_land(lat, lng))
```

The `is_on_bali_land()` function (defined in migration `0001`) uses a
simplified polygon of Bali's landmass to reject coordinates that fall in
the ocean. This catches a common OSM data-quality issue where some outlets
are mapped offshore.

## RLS policies

See [`Locinsights_db/policies/README.md`](https://github.com/bayhaqy/Locinsights_db)
for the full RLS policy catalog. Summary:

| Table | anon SELECT | anon INSERT | anon UPDATE | anon DELETE |
|---|---|---|---|---|
| Master tables (stores, malls, etc.) | ✅ | ❌ | ❌ | ❌ |
| `field_surveys` | ❌ | ✅ (PWA submission) | ❌ | ❌ |
| Staging tables | ❌ | ❌ | ❌ | ❌ |
| `ml_models`, `predictions` | ✅ | ❌ | ❌ | ❌ |
| `ab_tests`, `reports` | ✅ | ❌ | ❌ | ❌ |

All writes go through the Next.js API (using the `service_role` key server-side).

## Migration order

Migrations in [`Locinsights_db`](https://github.com/bayhaqy/Locinsights_db) MUST
be applied in numerical order:

1. `0001_init_extensions_and_enums.sql` — PostGIS + pg_trgm + all ENUMs + `is_on_bali_land()`
2. `0002_master_data.sql` — countries, provinces, kabupaten, kecamatan, kelurahan, brands, stores, malls, mall_tenants, pois
3. `0003_staging_and_ml.sql` — staging_* tables, ml_models, training_runs, predictions, ab_tests, reports, field_surveys
4. `0004_rls_and_merge_functions.sql` — RLS policies + `merge_staging_*()` functions
5. `0005_seed_bali_data.sql` — Seed: 1 country, 1 province, 9 kabupaten, 48 kecamatan, 172 kelurahan, 27 brands, 18 malls, 25 POIs
6. `0006_fix_staging_malls_and_functions.sql` — Bugfixes for staging_malls FK + merge functions
