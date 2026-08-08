# Architecture

> System design for LocInsight v4.0 (Aug 2026).

## High-level diagram

```
                            ┌─────────────────────┐
                            │  User (browser)     │
                            └──────────┬──────────┘
                                       │ HTTPS
                                       ▼
                ┌──────────────────────────────────────────┐
                │  Vercel — Next.js 16 (App Router)        │
                │  ─ React 19 + Tailwind 4 + shadcn/ui    │
                │  ─ 32 API routes (Route Handlers)        │
                │  ─ Standalone build output               │
                │  ─ Cron: anti-sleep every 15 min         │
                └────────────┬─────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
   ┌────────────────────┐        ┌──────────────────────┐
   │  Supabase          │        │  Hugging Face Space  │
   │  PostgreSQL 15     │        │  (static — PyScript) │
   │  + PostGIS         │        │  Standalone ML       │
   │  + RLS policies    │        │  explorer (optional) │
   └─────────┬──────────┘        └──────────┬───────────┘
             │                              │
             ▼                              ▼
   ┌────────────────────┐        ┌──────────────────────┐
   │  OSM (Overpass +   │        │  User's browser      │
   │  Nominatim)        │        │  (Pyodide WASM)      │
   │  Live scrape data  │        │  in-browser sklearn  │
   └────────────────────┘        └──────────────────────┘
```

## Request flow

### Production app (Vercel)

1. Browser loads `/` — Next.js serves the SPA shell (`page.tsx`).
2. Client fetches `/api/locinsight/overview` — single aggregated payload with KPIs,
   top opportunities, and stats. Subsequent tab clicks lazy-load their own data.
3. Each API route handler:
   - Validates input
   - Calls Prisma client (singleton via `src/lib/db.ts`)
   - Returns JSON with `{ success: boolean, data?: T, error?: string }`
4. Prisma translates to Postgres + PostGIS queries on Supabase.
5. Anti-sleep cron at `/api/cron/anti-sleep` pings every 15 min to keep the
   Supabase connection pool warm and the HF Space alive.

### Scraper flow

1. User picks a location (Bali / Kabupaten / Kecamatan / Kelurahan) and a mode
   (keyword or brand sweep) in the UI.
2. `POST /api/locinsight/scrape` calls `runScrape()` in `scraper-engine.ts`:
   - Resolves the location filter to a bbox (1× DB query, cached per request).
   - Calls Overpass (3 endpoints raced; first non-empty wins).
   - For each OSM element: reverse-geocode to nearest kelurahan (in-memory,
     no DB call per element).
3. Results returned to the UI — **NOT saved yet**.
4. User reviews, multi-selects rows, sees a classification badge on each
   (MAA store / Competitor / Other).
5. `POST /api/locinsight/scrape-save`:
   - Loads existing dedup cache (stores + competitors + malls + POIs) once.
   - For each selected row:
     - `kind=mall` → `malls` table
     - `kind=poi` → `pois` table
     - `kind=store` → `classifyScrapedBrand(brand_name)`:
       - `maa_store` → `stores` table with `brand_id` + `parent` from catalog
       - `competitor` / `other` → `competitor_stores` table
   - Dedup rule: skip if a record of the same brand exists within 50 m.

### ML prediction flow

1. `GET /api/locinsight/ml?action=predict_revenue&kelurahan_id=...&brand_id=...`
2. `loadModel()` — checks for in-memory trained model first, then falls back
   to the JSON artifact at `prisma/ml-models/gbr-revenue-bali-v1.json`
   (60-second in-process cache).
3. `buildFeatureVector()` — assembles 10 features for the kelurahan × brand pair
   (population, density, urban_index, income_index, tourist_index,
   transport_index, poi_density_index, mall_proximity, existing_store_density,
   brand_strength).
4. `predictGBR()` — walks 100 boosted trees (max depth 4, learning rate 0.1),
   sums predictions, computes per-feature SHAP-style contributions.
5. Response includes `predicted_revenue_juta` + `confidence` + top 5 features.

## Directory layout (deep dive)

### `src/app/api/locinsight/` — 32 endpoints

| Resource group | Endpoints |
|---|---|
| `overview` | `GET /overview` — aggregated dashboard data |
| `locations` | `GET /locations` — admin hierarchy (provinces, kabupaten, kecamatan, kelurahan) |
| `kabupaten` | `GET/POST/PATCH/DELETE` |
| `kecamatan` | `GET/POST/PATCH/DELETE` |
| `kelurahan` | `GET/POST/PATCH/DELETE` |
| `brands` | `GET/POST/PATCH/DELETE` |
| `stores` | `GET/POST/PATCH/DELETE` (master MAA/MAP stores) |
| `competitors` | `GET/POST/PATCH/DELETE` (competitor stores) |
| `malls` + `mall-tenants` | `GET/POST/PATCH/DELETE` |
| `pois` | `GET/POST/PATCH/DELETE` |
| `opportunities` | `GET /opportunities` — ranked kelurahan list |
| `analyze` | `GET /analyze?kelurahan_id=...` — per-kelurahan deep dive |
| `ab-test` | `POST /ab-test` — A/B comparison |
| `reports` | `GET /reports?type=...` — export PDF/CSV/JSON |
| `field-survey` | `GET/POST/PATCH` — PWA survey submission + review |
| `bulk` | `POST /bulk` — import/export CSV |
| `scrape` | `POST /scrape` — unified scraper |
| `scrape-save` | `POST /scrape-save` — save selected rows with routing |
| `ml` + `ml/train` | `GET /ml?action=...` + `POST /ml/train` |
| `cron/anti-sleep` | `GET` (cron-only) |

### `src/components/locinsight/` — 19 domain components

Each sidebar tab maps to one component. Heavy components (`map-explorer`,
`data-manager`, `scraper`, `analysis`) are large (300–900 lines) but
self-contained — they own their data fetching and local state.

### `src/lib/scoring/engine.ts` — Composite Opportunity Score

The engine computes a 0–100 score for every kelurahan using 10 weighted factors:

| Factor | Weight | Source |
|---|---|---|
| Population density | 12 % | BPS 2024 |
| Income index (GDRP per capita × urban score) | 15 % | BPS 2024 |
| Tourist index (POI magnitude + hotel count) | 12 % | OSM + BPS |
| Transport index (road density + transit hubs) | 8 % | OSM |
| POI density within 5 km | 10 % | OSM |
| Mall proximity index | 10 % | malls table |
| Existing store density (MAA, 1 km) | 8 % | stores table |
| Competitor density (1 km) | 10 % | competitor_stores table |
| Coastal flag (tourist boost) | 5 % | bali-land.ts |
| Brand-fit multiplier | 10 % | brand catalog |

Total weights sum to 100 %. The methodology is fully transparent — see the
Methodology tab in the app and `src/components/locinsight/methodology.tsx`.

## Performance budget

| Metric | Target | Actual |
|---|---|---|
| First Contentful Paint | < 1.5 s | ~1.2 s (Vercel edge) |
| `/overview` response | < 800 ms | ~450 ms (cached Prisma) |
| Scraper (keyword mode) | < 60 s | ~18 s average |
| Scraper (brand sweep, 27 brands) | < 60 s | ~22 s average |
| ML prediction | < 200 ms | ~80 ms (in-memory model) |
| Map choropleth render | < 1 s | ~600 ms (GADM polygons) |

## Security

- **RLS enabled** on all 16 tables. Anon key can read master data; writes
  require the service_role key (server-only, never exposed to client).
- **Staging tables** (scraper review queue) have NO anon access — only
  service_role can read/write.
- **Field surveys** — anon can INSERT (PWA submission) but cannot SELECT,
  UPDATE, or DELETE (prevents scraping of competitor survey data).
- **Secrets** — Supabase service_role key is server-only (Vercel env var);
  the publishable (anon) key is embedded client-side and is safe to expose
  due to RLS.

## Failure modes & mitigations

| Failure | Mitigation |
|---|---|
| Overpass rate-limit (429) | Race 3 endpoints; throw on empty so `Promise.any` keeps waiting |
| Overpass timeout (>20 s) | Abort controller + 20 s cap; UI shows "scrape failed, try again" |
| Scraper returns nothing | UI surfaces the empty result with diagnostic hints (try different keywords, check location filter) |
| Supabase cold start | Anti-sleep cron every 15 min pings `SELECT 1` |
| HF Space cold start | Anti-sleep cron pings `/health`; static Space has no cold start anyway |
| Prisma connection pool exhaustion | Singleton client; `pgbouncer=true` in connection string |
| OSM coordinates in ocean | `is_on_bali_land()` CHECK constraint at the DB level rejects |

## Operational runbook

See [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) for:
- Vercel project setup + custom domain
- Supabase project setup + RLS policies
- HF Space deployment
- Environment variables
- Cron job management
