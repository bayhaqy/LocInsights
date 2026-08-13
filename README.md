# LocInsights

> Enterprise-grade location intelligence platform for retail store expansion decisions.
> Built for **MAP Active Adiperkasa (MAA)** to identify high-potential store sites in
> Tier-2/3 cities and untapped catchments. Proof-of-concept region: **Bali, Indonesia**.

[![Production](https://img.shields.io/badge/Production-locinsights.bayhaqy.my.id-C8102E?style=flat-square)](https://locinsights.bayhaqy.my.id)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL+PostGIS-3ECF8E?style=flat-square)](https://supabase.com)

---

## What is LocInsights?

LocInsights is an end-to-end site-selection tool that combines **authoritative government
data** (BPS Bali), **live web data** (OpenStreetMap), and **ML-driven scoring** to surface
the best kelurahan (urban village) for the next store opening of any brand in the MAA /
MAP portfolio.

It is the next-generation evolution of manual GIS spreadsheets, replacing gut-feel
site selection with a transparent, reproducible scoring framework calibrated to
historical store performance and competitive landscape.

### Key capabilities

| Module | What it does |
|---|---|
| **Interactive Map Explorer** | Choropleth heatmap by kabupaten/kecamatan, scatter plot of all stores, GADM-polygon overlays |
| **Opportunity Finder** | Ranks 172 Bali kelurahan by composite opportunity score (10 weighted factors) |
| **Deep Analysis** | Per-kelurahan deep dive: catchment area, POI density, competitor proximity, isochrones |
| **Brand Coverage** | Which MAA/MAP brands are present where, with gap analysis |
| **Mall Network & Tenants** | All Bali malls with live tenant audit (Overpass-powered) |
| **Competitor Intelligence** | 27 tracked competitor brands (Indomaret, Alfamart, McDonald's, etc.) — scraped from OSM |
| **A/B Site Simulator** | Compare two candidate sites side-by-side with weighted scoring |
| **ML / AI Engine** | Pure-TypeScript Gradient Boosted Regressor (GBR) for revenue forecasting + training pipeline |
| **Reports** | Export PDF / CSV / JSON of any analysis |
| **Data Manager** | Full CRUD master data management with AG Grid-style inline editing + bulk import/export |
| **Data Scraper** | Unified OSM scraper with hierarchical location filter (Bali → Kab → Kec → Kel) and smart brand classification |
| **Methodology** | Transparent scoring rubric + math explanation |
| **About** | Project context, data sources, FAQ |
| **Users Management** ⭐ | **(superadmin only)** Full CRUD on users + per-role per-menu CRUD+export permission matrix |

### Authentication & Role-Based Access Control (RBAC) ⭐

LocInsights v5.0 ships with a complete authentication system (NextAuth v4 + bcrypt) with
5 built-in roles and per-menu, per-action permission matrix:

| Role | Default permissions |
|---|---|
| **superadmin** | Full CRUD + export on all 17 menus, including Users Management |
| **admin** | Full CRUD + export on all features **except** Users Management |
| **data** | Full CRUD + export ONLY on Reports, Data Manager, Data Scraper; read-only on others |
| **analyst** | Read + run ML/AI forecasts (no master data mutations) |
| **viewer** | Read-only across the app, **no exports anywhere** |

The superadmin can customize any role's permissions from **Users Management → Roles tab**
using a 17-row × 5-column (read/create/update/delete/export) matrix editor. Changes take
effect immediately for new sessions.

Default seeded accounts (run `bun run seed:users` to seed):

| Username | Password | Role |
|---|---|---|
| `bayhaqy` | `LocInsights@01!!` | superadmin |
| `admin` | `admin` | admin |
| `data` | `data` | data |
| `demo` | `demo` | viewer |

The seeder is idempotent and supports `--reset-password <username> <newPassword>`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Vercel (Next.js 16 App Router, React 19, TypeScript)               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  /app          → page routes (Dashboard, Map, ML, etc.)     │   │
│  │  /app/api      → 32 REST endpoints (CRUD + analytics)       │   │
│  │  /components   → 47 React components (locinsight/ + ui/)    │   │
│  │  /lib          → scoring engine, ML, scraper, data catalog  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         │  Prisma Client (PostgreSQL + PostGIS)                     │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Supabase (PostgreSQL 15 + PostGIS + RLS)                   │   │
│  │  • countries → provinces → kabupaten → kecamatan → kelurahan│   │
│  │  • brands (27 MAA/MAP) + stores (master)                    │   │
│  │  • competitor_stores (separate table — never mixed)         │   │
│  │  • malls + mall_tenants + pois                              │   │
│  │  • staging_* tables for scraper review workflow             │   │
│  │  • ml_models + training_runs + predictions                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│         │                                                           │
│         │  Anti-sleep cron (every 15 min)                           │
│         ▼                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Hugging Face Space (static) — PyScript + Pyodide           │   │
│  │  Standalone ML explorer for analysts                        │   │
│  │  (bayhaqy-locinsights-ml.static.hf.space)                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

The frontend talks **only** to Supabase via Prisma. The HF Space is an
optional standalone analytics surface for data scientists; it is NOT in
the request path of the production app.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system design.

---

## Repository layout

```
LocInsights/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/locinsight/           # 32 REST endpoints
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Main SPA shell
│   │   └── survey/page.tsx           # Field-survey PWA
│   ├── components/
│   │   ├── locinsight/               # 19 domain components
│   │   └── ui/                       # shadcn/ui primitives (28)
│   ├── hooks/
│   └── lib/
│       ├── data/                     # Bali datasets (admin, malls, brands, POIs)
│       ├── ml/                       # GBR model + dataset builder + cache
│       ├── scoring/                  # Composite opportunity score engine
│       ├── scraper-engine.ts         # Unified OSM scraper (keyword + brand modes)
│       ├── brand-classifier.ts       # MAA vs competitor routing
│       ├── api-helpers.ts            # Shared paginate + error handlers
│       └── db.ts                     # Prisma client singleton
├── prisma/
│   ├── schema.prisma                 # 16 models + 9 enums + RLS hints
│   └── ml-models/
│       └── gbr-revenue-bali-v1.json  # Baseline GBR model artifact
├── public/
│   ├── geojson/                      # GADM-polygon bali-kabupaten.geojson + bali-kecamatan.geojson
│   ├── manifest.json                 # PWA manifest (for /survey)
│   ├── robots.txt
│   └── sw.js                         # Service worker (offline survey PWA)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SCRAPER.md                    # How the unified scraper works
│   ├── DATA_MODEL.md                 # Schema explanation + ERD
│   └── DEPLOYMENT.md
├── scripts/                          # Maintenance scripts (gitignored)
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── eslint.config.mjs
├── vercel.json                       # Cron + build config
└── README.md                         # This file
```

---

## Local development

### Prerequisites

- **Node.js ≥ 20** (or **Bun ≥ 1.3** — preferred; faster install + dev)
- A Supabase project (or local Postgres + PostGIS)
- An `.env` file at the repo root with:

  ```env
  DATABASE_URL="postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
  DIRECT_URL="postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:5432/postgres"
  NEXTAUTH_SECRET="generate with: openssl rand -base64 32"
  NEXTAUTH_URL="http://localhost:3000"  # public URL on Vercel, auto-set
  ```

### Quick start

```bash
# 1. Install dependencies (bun preferred)
bun install

# 2. Generate Prisma client (also runs automatically via postinstall hook)
bun run db:generate

# 3. Push schema to your Supabase project
bun run db:push

# 4. Seed Bali admin + brands + malls + POIs
bun run seed

# 5. Seed default users + roles (superadmin/admin/data/viewer)
bun run seed:users

# 6. Start dev server
bun run dev
# → http://localhost:3000
```

### Production build

```bash
bun run build      # next build (standalone output)
bun run start      # next start
```

Vercel auto-deploys on every push to `main`. Production URL:
**https://locinsights.bayhaqy.my.id**

---

## Key design decisions

### 1. Stores vs Competitor Stores — never mixed
The master `stores` table contains **only MAA/MAP portfolio brands** (Starbucks,
Ace Hardware, Sports Station, etc.). All competitor brands (Indomaret, Alfamart,
McDonald's, etc.) live in a separate `competitor_stores` table.

The `brand-classifier.ts` module enforces this routing during scraping —
**a competitor brand can never accidentally land in `stores`**, even if the
scraper picks it up. This fixes a recurring data-pollution bug from v1.

### 2. Unified scraper with two modes
A single `/api/locinsight/scrape` endpoint replaces the previous two near-duplicate
scrapers. Mode toggle:
- **`keyword`** — free-text query (e.g., "Starbucks Kuta") → Nominatim geocode → bbox Overpass
- **`brand`** — predefined brand catalog → full Bali bbox Overpass sweep

Both modes accept a hierarchical location filter (`kab_code` / `kec_code` /
`kel_code`) to scope the scrape.

### 3. Staging-table review workflow
Scraper output NEVER writes directly to master tables. The frontend shows scraped
results in a review panel; the user selects which rows to keep, then a single
`POST /scrape-save` call routes them to the appropriate master table after
brand classification + dedup (50 m rule).

### 4. Pure-TypeScript ML
The GBR model is implemented in pure TypeScript (`src/lib/ml/gbr.ts`) — no Python
sidecar, no cold-start, no HF dependency for production traffic. The HF Space
exists only as a standalone analytics tool.

### 5. PostGIS geography columns
Every spatial table has a `geom geography(point, 4326)` column generated from
`lat`+`lng`. All proximity queries use `ST_DWithin` for sub-millisecond
performance even at 10 k+ rows.

### 6. Anti-ocean coordinate validation
A SQL `CHECK` constraint rejects any coordinate that falls in the Bali Sea —
a common OSM data-quality issue. The `is_on_bali_land(lat, lng)` function is
defined in migration `0001`.

---

## Documentation

| Doc | What's inside |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System diagram, request flow, deployment topology |
| [`docs/SCRAPER.md`](docs/SCRAPER.md) | How the unified scraper + brand classifier + review workflow works |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Schema explanation, ERD, RLS policies, migration order |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Vercel + Supabase + HF Space setup, secrets, cron |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Release history |

---

## Related repositories

| Repo | Purpose |
|---|---|
| [`bayhaqy/LocInsights`](https://github.com/bayhaqy/LocInsights) | **This repo** — Next.js frontend + API |
| [`bayhaqy/Locinsights_db`](https://github.com/bayhaqy/Locinsights_db) | Supabase SQL migrations + RLS policies + seed data |
| [`Bayhaqy/LocInsights_ml`](https://huggingface.co/spaces/Bayhaqy/LocInsights_ml) | HF Space — PyScript ML explorer (standalone) |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Lucide icons |
| Maps | Leaflet + leaflet.heat + react-leaflet (with GADM GeoJSON) |
| Charts | Recharts |
| Backend | Next.js Route Handlers (32 endpoints), Prisma ORM 6 |
| Database | Supabase (PostgreSQL 15 + PostGIS + pg_trgm + RLS) |
| ML | Pure-TypeScript Gradient Boosted Regressor (Friedman 2001) |
| Data sources | OpenStreetMap (Nominatim + Overpass), BPS Bali 2024, GADM admin boundaries |
| Hosting | Vercel (frontend + cron) · Supabase (DB) · Hugging Face Spaces (standalone ML) |
| Package manager | Bun 1.3+ (Node 20+ also works) |

---

## Maintained by

**Achmad Bayhaqy** — Data Team, MAP Active Adiperkasa (MAA)
Last updated: 2026-08-09

## License

Apache-2.0 — see [`LICENSE`](LICENSE).
