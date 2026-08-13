# LocInsights

> **Multi-tenant SaaS location-intelligence platform** for retail store expansion
> decisions. Built on Next.js 16 App Router, Supabase (PostgreSQL + PostGIS +
> per-tenant RLS), and a pure-TypeScript ML engine. Sold under three commercial
> tiers (Managed SaaS, Enterprise On-Premise, and Professional Services Add-ons).

[![Production](https://img.shields.io/badge/Production-locinsights.bayhaqy.my.id-C8102E?style=flat-square)](https://locinsights.bayhaqy.my.id)
[![Version](https://img.shields.io/badge/Version-5.0.0-SaaS-blue?style=flat-square)](docs/CHANGELOG.md)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-App%20Router-black?style=flat-square)](https://nextjs.org)
[![Auth](https://img.shields.io/badge/Auth-NextAuth%20v4%20+%20JWT%20+%20RLS-3ECF8E?style=flat-square)](docs/ARCHITECTURE.md)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20PostGIS%20%2B%20RLS-3ECF8E?style=flat-square)](https://supabase.com)

---

## What is LocInsights?

LocInsights is the next-generation evolution of MAP Active Adiperkasa's internal
site-selection tool, **re-engineered from a single-tenant proof of concept into
a multi-tenant SaaS platform** that can serve multiple enterprise customers on a
single shared infrastructure. The platform combines **authoritative government
data** (BPS — Badan Pusat Statistik), **live web data** (OpenStreetMap via
Nominatim + Overpass), and **ML-driven scoring** to surface the best
kelurahan (urban village) for a retail brand's next store opening.

It replaces manual GIS spreadsheets and gut-feel site selection with a
transparent, reproducible scoring framework calibrated to historical store
performance and competitive landscape. Each tenant (a subscribing organization)
sees only their own brands, stores, malls, competitors, POIs, scrapes, ML
models, and reports — enforced simultaneously at three layers (JWT claim,
PostgreSQL RLS, and Prisma app-layer filter) for defense-in-depth.

The platform supports **white-labeling** (per-tenant app name, logo URL,
primary/accent colors), **6-role RBAC** with a 17-menu × 5-action permission
matrix (85 cells per role), **tenant switching** for superadmins without
relogin, and **DB-backed documentation storage** that fixes a long-standing
Vercel read-only filesystem bug.

### Key capabilities

| Module | What it does |
|---|---|
| **Interactive Map Explorer** | Choropleth heatmap by kabupaten/kecamatan, scatter plot of all stores, GADM-polygon overlays |
| **Opportunity Finder** | Ranks kelurahan by composite opportunity score (10 weighted factors) |
| **Deep Analysis** | Per-kelurahan deep dive: catchment area, POI density, competitor proximity, isochrones |
| **Brand Coverage** | Which tenant's brands are present where, with gap analysis |
| **Mall Network & Tenants** | Mall directory with live tenant audit (Overpass-powered) |
| **Competitor Intelligence** | Tracked competitor brands (Indomaret, Alfamart, McDonald's, etc.) — scraped from OSM |
| **A/B Site Simulator** | Compare two candidate sites side-by-side with weighted scoring |
| **ML / AI Engine** | Pure-TypeScript Gradient Boosted Regressor (GBR) for revenue forecasting + training pipeline |
| **Reports** | Export PDF / CSV / JSON of any analysis |
| **Data Manager** | Full CRUD master data management with AG Grid-style inline editing + bulk import/export |
| **Data Scraper** | Unified OSM scraper with hierarchical location filter and smart brand classification |
| **Methodology** | Transparent scoring rubric + math explanation |
| **Documentation** | In-app docs UI with DB-backed storage, live markdown editor, and per-tenant scoping |
| **Users Management** | 4-tab admin panel (Tenants, Users, Roles, Audit Log) with permission-matrix editor |
| **Tenant Switching** | Superadmin can switch between any active tenant from header dropdown (no relogin) |
| **Authentication** | NextAuth v4 + Credentials provider + bcrypt + IP rate-limiting + DB lockout + audit logging |

Each module above is gated by the per-role permission matrix: a user only sees
menus they have `read` permission on, and only sees data within their tenant
(unless they are superadmin in platform-wide mode).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (any tenant's user)                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Public:  /                          → marketing landing    │    │
│  │  Auth:    /login                     → NextAuth Credentials │    │
│  │  App:     /(app)/dashboard, /map, …  → 18 protected routes  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS + JWT (carries tenant_id claim)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Vercel — Next.js 16 (App Router, React 19, TypeScript)             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  middleware.ts        → withAuth: every / route protected   │    │
│  │  (app)/layout.tsx     → getServerSession → /login fallback  │    │
│  │  /api/locinsight/*    → 32 domain REST endpoints            │    │
│  │  /api/admin/*         → users, roles, tenants, audit-logs   │    │
│  │  /api/docs/*          → DB-backed docs CRUD                 │    │
│  │  /api/auth/*          → NextAuth + /switch-tenant           │    │
│  └─────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Prisma 6 (singleton client)
                             │ + setTenantContext() → SET LOCAL
                             │   app.current_tenant_id = '<uuid>'
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL 15 + PostGIS + pg_trgm + RLS per-tenant)      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  SaaS layer: tenants, tenant_addons, users, roles,          │    │
│  │              user_audit_logs, docs                          │    │
│  │  Tenant-scoped (RLS, 16 tables):                           │    │
│  │    brands, stores, malls, mall_tenants, competitor_stores,  │    │
│  │    pois, reports, scraper_runs, field_surveys, ab_tests,    │    │
│  │    ml_models, training_runs, predictions,                   │    │
│  │    staging_stores, staging_competitors, staging_malls       │    │
│  │  Shared (no RLS): countries, provinces,                     │    │
│  │    kabupaten, kecamatan, kelurahan                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Anti-sleep cron (every 15 min)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Hugging Face Space (static, PyScript + Pyodide)                    │
│  Standalone ML explorer for analysts — NOT in production path       │
└─────────────────────────────────────────────────────────────────────┘
```

The frontend talks **only** to Supabase via Prisma. Tenant isolation is enforced
at three layers (JWT claim → RLS policy → Prisma `where.tenant_id`), so even a
misconfigured RLS policy cannot leak data across tenants. The HF Space is an
optional standalone analytics surface for data scientists; it is NOT in the
request path of the production app.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system design
including the auth flow, tenant-switching flow, and RLS policy catalog.

---

## SaaS pricing

LocInsights is sold under three commercial models. All prices are in Indonesian
Rupiah (IDR) and exclude VAT (PPN 11%). The pricing is also visible on the
public marketing landing page at `/`.

### Skema A — Managed SaaS (cloud-hosted)

LocInsights is hosted by us on Vercel + Supabase. The customer gets a tenant
record with their own data, branding, and user roster, but no infrastructure
to manage. Backups, security patches, and platform upgrades are included.

| Billing | Price | Notes |
|---|---|---|
| Monthly | **Rp 25,000,000** / month | Best for pilots and short engagements |
| Annual | **Rp 250,000,000** / year | ~2 months free vs monthly billing |

**Includes:** up to 10 named users (additional users Rp 2jt/user/month),
1 region scope (additional regions see Skema C), 10,000 API calls/day, daily
backups, email support, SLA 99.5 % uptime, and all 16 functional modules.

### Skema B — Enterprise On-Premise (perpetual license)

For organizations that need to host LocInsights inside their own VPC, on their
own infrastructure, or air-gapped. The customer receives the full source code
and a perpetual license for internal use. Annual maintenance keeps them on the
latest version.

| Component | Price | Notes |
|---|---|---|
| One-time license | **Rp 450,000,000** | Perpetual, single internal deployment |
| Setup & implementation | **Rp 75,000,000** | On-site install, SSO integration, training |
| Annual maintenance (AMC) | **Rp 85,000,000** / year | Upgrades, patches, 8×5 support, SLA 99.9 % |

**Includes:** unlimited users, unlimited regions, unlimited API calls (subject
to the customer's own infrastructure), source code escrow option, and dedicated
Slack/Teams support channel.

### Skema C — Professional Services & Data Add-ons

À la carte services that complement Skema A or B. These are tracked as
`TenantAddon` records (with `addon_type` enum + JSON `addon_config`) so that
expiry and renewal can be managed in the Users Management → Tenants tab.

| Add-on | Price | Notes |
|---|---|---|
| Region expansion (per province) | **Rp 20,000,000** | Adds a province to the tenant's `region_scope` |
| Custom scraper (per source) | **Rp 25,000,000** | E.g. Tokopedia, GoFood, GoPay merchants |
| API connector | **from Rp 75,000,000** | Salesforce, SAP, internal DWH, etc. |
| UI customization | **Rp 5,000,000** / manday | White-labeling, custom dashboards, custom reports |
| Custom ML model | **from Rp 100,000,000** | Trained on customer's historical data |
| Data refresh service | **Rp 15,000,000** / month | Quarterly full re-scrape + QA |

All add-on purchases are recorded with an `expires_at` timestamp; the Users
Management UI surfaces expiring add-ons 30 days before expiry so the account
manager can initiate renewal.

---

## Repository layout

```
LocInsights/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── page.tsx                      # Public marketing landing page (/)
│   │   ├── layout.tsx                    # Root layout (SessionProvider)
│   │   ├── login/page.tsx                # NextAuth Credentials login (/login)
│   │   ├── survey/page.tsx               # Field-survey PWA (/survey, public)
│   │   │
│   │   ├── (app)/                        # Protected route group (18 routes)
│   │   │   ├── layout.tsx                # getServerSession → /login fallback
│   │   │   ├── app-shell.tsx             # Sidebar + header + tenant switcher
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── map/page.tsx
│   │   │   ├── opportunities/page.tsx
│   │   │   ├── analysis/page.tsx
│   │   │   ├── brands/page.tsx
│   │   │   ├── malls/page.tsx
│   │   │   ├── mall-tenants/page.tsx
│   │   │   ├── competitors/page.tsx
│   │   │   ├── ab/page.tsx               # A/B site simulator
│   │   │   ├── ml/page.tsx               # ML / AI engine
│   │   │   ├── reports/page.tsx
│   │   │   ├── data/page.tsx             # Data manager
│   │   │   ├── scraper/page.tsx
│   │   │   ├── methodology/page.tsx
│   │   │   ├── docs/page.tsx             # DB-backed documentation UI
│   │   │   ├── users/page.tsx            # Users Management (4 tabs)
│   │   │   ├── about/page.tsx
│   │   │   └── settings/page.tsx         # Per-tenant settings
│   │   │
│   │   └── api/
│   │       ├── auth/                     # NextAuth + switch-tenant
│   │       │   ├── [...nextauth]/route.ts
│   │       │   └── switch-tenant/route.ts
│   │       ├── admin/                    # Admin API routes
│   │       │   ├── users/route.ts + [id]/route.ts
│   │       │   │   ├── [id]/reset-password/route.ts
│   │       │   │   └── [id]/reset-lockout/route.ts
│   │       │   ├── roles/route.ts + [id]/route.ts
│   │       │   ├── tenants/route.ts + [id]/route.ts
│   │       │   └── audit-logs/route.ts
│   │       ├── docs/                     # DB-backed docs API
│   │       │   ├── route.ts + [slug]/route.ts
│   │       │   └── categories/route.ts
│   │       ├── locinsight/               # 32 domain REST endpoints
│   │       │   ├── overview, locations, kabupaten, kecamatan, kelurahan
│   │       │   ├── brands, stores, competitors, malls, mall-tenants, pois
│   │       │   ├── opportunities, analyze, ab-test, reports, ml, ml/train
│   │       │   ├── scrape, scrape-save, bulk, chat, field-survey
│   │       │   └── countries, provinces
│   │       └── cron/anti-sleep/route.ts  # 15-min keep-alive
│   │
│   ├── components/
│   │   ├── locinsight/                   # 32 domain components
│   │   │   ├── user-management.tsx       # 4-tab admin panel
│   │   │   ├── documentation.tsx         # DB-backed docs UI (1345 lines)
│   │   │   ├── tenant-switcher.tsx       # Header dropdown for superadmin
│   │   │   ├── permission-gate.tsx       # Client-side RBAC wrapper
│   │   │   ├── sidebar.tsx, header, app-shell, ai-chat, dashboard, map-explorer, etc.
│   │   │   └── …
│   │   └── ui/                           # shadcn/ui primitives
│   │
│   ├── hooks/
│   └── lib/
│       ├── auth.ts                       # NextAuth config (Credentials + JWT)
│       ├── auth-server.ts                # requireAuth / requireSuperadmin / canAccessTenant
│       ├── auth-provider.tsx             # Client SessionProvider wrapper
│       ├── permissions.ts                # 17 menus × 5 actions = 85 cells
│       ├── tenant-context.ts             # setTenantContext + tenantFilter (RLS helper)
│       ├── audit-log.ts                  # UserAuditLog writer (login + CRUD)
│       ├── api-helpers.ts, utils.ts, db.ts
│       ├── i18n/                         # EN + ID translations
│       ├── data/                         # Bali datasets (admin, malls, brands, POIs)
│       ├── ml/                           # GBR model + dataset builder + cache
│       ├── scoring/                      # Composite opportunity score engine
│       ├── scraper-engine.ts             # Unified OSM scraper
│       └── brand-classifier.ts           # MAA vs competitor routing
│
├── prisma/
│   ├── schema.prisma                     # 27 models + 22 enums + RLS hints
│   └── ml-models/
│       └── gbr-revenue-bali-v1.json      # Baseline GBR model artifact
│
├── public/                               # GeoJSON, manifest, service worker
├── docs/                                 # Markdown source for DB-backed docs
│   ├── ARCHITECTURE.md
│   ├── CHANGELOG.md
│   ├── DATA_MODEL.md
│   ├── DEPLOYMENT.md
│   ├── SCRAPER.md
│   └── USER_GUIDE.md
│
├── scripts/
│   ├── seed-db.ts                        # Bali data (admin + brands + malls + POIs)
│   ├── seed-users.ts                     # Default tenants, users, roles, permissions
│   ├── seed-docs.ts                      # Migrate /docs/*.md → DB Doc rows
│   ├── gen-user-hashes.ts                # bcrypt hash generator
│   ├── apply_supabase_migrations.py
│   ├── verify-fix.ts
│   └── start-dev.sh
│
├── package.json                          # v5.0.0
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── eslint.config.mjs
├── vercel.json                           # Cron + build config
└── README.md                             # This file
```

---

## Local development

### Prerequisites

- **Node.js ≥ 20** (or **Bun ≥ 1.3** — preferred; faster install + dev)
- A Supabase project (or local Postgres + PostGIS) with migration `0009_saas_multi_tenant_auth.sql` applied
- An `.env.local` file at the repo root (gitignored) with at minimum:

  ```env
  DATABASE_URL="postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
  DIRECT_URL="postgresql://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:5432/postgres"

  # NextAuth (REQUIRED for v5 — generate with: openssl rand -base64 32)
  NEXTAUTH_SECRET="your-random-32-byte-secret"
  NEXTAUTH_URL="http://localhost:3000"

  # AI chat assistant (optional — falls back to /etc/.z-ai-config in dev)
  ZAI_BASE_URL=https://internal-api.z.ai/v1
  ZAI_API_KEY=...
  ZAI_TOKEN=...
  ZAI_USER_ID=...
  ZAI_CHAT_ID=...
  ```

### Quick start

```bash
# 1. Install dependencies (bun preferred)
bun install

# 2. Generate Prisma client
bun run db:generate

# 3. Push schema to your Supabase project
#    (or apply SQL migration 0009 manually — see docs/DEPLOYMENT.md)
bun run db:push

# 4. Seed Bali admin hierarchy + brands + malls + POIs
bun run seed

# 5. Seed SaaS layer (tenants + users + roles + permission matrix)
bun run seed:users

# 6. (Optional) Migrate markdown docs → DB Doc rows
bun run scripts/seed-docs.ts

# 7. Start dev server
bun run dev
# → http://localhost:3000  (public landing page)
# → http://localhost:3000/login  (sign in with bayhaqy / LocInsights@01!!)
```

The `seed:users` script creates 4 default users so you can test every role
without manual setup. Default credentials (also documented in
[`scripts/seed-users.ts`](scripts/seed-users.ts)):

| Username | Password | Role | Tenant |
|---|---|---|---|
| `bayhaqy` | `LocInsights@01!!` | superadmin | (platform-wide, no tenant) |
| `admin_map` | `admin_map` | admin | MAP Active Adiperkasa |
| `data_map` | `data_map` | data | MAP Active Adiperkasa |
| `demo_map` | `demo_map` | viewer | MAP Active Adiperkasa |

**Rotate these passwords immediately in any non-local environment** via the
Users Management UI (Reset Password dialog) or by re-running
`bun run seed:users --reset-password` and then changing each one.

### Production build

```bash
bun run build      # prisma generate && next build (standalone output)
bun run start      # next start -p 3000
```

Vercel auto-deploys on every push to `main`. Production URL:
**https://locinsights.bayhaqy.my.id**

---

## Key design decisions

### 1. Multi-tenant via shared DB + `tenant_id` + RLS (NOT schema-per-tenant)

We chose **shared database with row-level tenant_id columns + PostgreSQL RLS
policies** over the schema-per-tenant alternative. This means a single
`stores` table holds every tenant's stores, but each row carries a `tenant_id`
foreign key, and a per-tenant RLS policy uses
`current_setting('app.current_tenant_id', true)` to silently filter queries so
tenant A can never see tenant B's rows. Schema-per-tenant was rejected because
it complicates migrations (N schemas × M migrations = NM operations), prevents
cross-tenant analytics for superadmins, and forces connection-pool churn as
each request would need to set its search_path. The shared-DB approach keeps
the migration story linear (one `0009_saas_multi_tenant_auth.sql` adds tenant
isolation to all 16 private tables at once), lets superadmin see all tenants
in platform-wide mode, and is the same model used by Supabase, Notion, and
Linear.

### 2. JWT claim carries `tenant_id` (no URL change for tenant switching)

Tenant identity is carried **inside the JWT** (`token.tenant_id`), not in the
URL. This means a superadmin can switch from tenant A to tenant B without a
page navigation — the client calls `POST /api/auth/switch-tenant` to validate,
then `next-auth/react`'s `update({ tenant_id: newId })` rewrites the JWT, then
`router.refresh()` reloads all server components with the new context. The
URL stays `/dashboard` the whole time. The alternative (URL-based scoping like
`/t/tenant-a/dashboard`) would force a full-page reload on every switch,
break the browser back button, and complicate SEO for the public landing
page. The JWT approach is also how Vercel, GitHub Organizations, and Slack
workspaces implement switching.

### 3. Defense-in-depth: RLS at DB + tenantFilter at Prisma + JWT claim

Tenant isolation is enforced at three independent layers so that a
misconfiguration in any one layer cannot leak data:

1. **JWT claim** (auth layer) — `session.user.tenant_id` is set at login.
   Used to resolve the active tenant in every API route.
2. **PostgreSQL RLS** (DB layer) — every tenant-scoped table has a policy
   `USING (tenant_id = current_setting('app.current_tenant_id', true))`.
   Activated by `SET LOCAL app.current_tenant_id = '<uuid>'` at the start
   of each request (see `src/lib/tenant-context.ts`).
3. **Prisma `where.tenant_id`** (app layer) — every query explicitly filters
   by `tenant_id` via the `tenantFilter(session)` helper. Even if RLS is
   bypassed (e.g. PgBouncer transaction mode on Supabase's free tier), the
   app-layer filter still applies.

The RLS layer is the authoritative guard; the app-layer filter is the safety
net. Both must fail simultaneously for a leak to occur, which requires a
coordinated misconfiguration.

### 4. DB-backed documentation (fixes Vercel read-only filesystem issue)

Documentation is stored in the `docs` PostgreSQL table (Prisma `Doc` model),
not on the filesystem. The previous filesystem-based approach broke on Vercel
because serverless functions have a **read-only filesystem** — `fs.writeFile`
threw `EACCES` and returned an empty body to the client, causing the
notorious `"Failed to execute 'json' on 'Response': Unexpected end of JSON
input"` error. Moving docs to Postgres eliminates the filesystem dependency
entirely: every doc CRUD goes through Prisma, never touches the disk, and the
seed script (`scripts/seed-docs.ts`) is the only component that reads
markdown files from `/docs/` (a one-shot migration tool, not part of the
request path).

### 5. Stores vs Competitor Stores — never mixed

The master `stores` table contains **only the tenant's portfolio brands**
(e.g. Starbucks, Ace Hardware, Sports Station). All competitor brands
(Indomaret, Alfamart, McDonald's, etc.) live in a separate
`competitor_stores` table. The `brand-classifier.ts` module enforces this
routing during scraping — a competitor brand can never accidentally land in
`stores`, even if the scraper picks it up. This fixes a recurring
data-pollution bug from v1.

### 6. Unified scraper with two modes

A single `/api/locinsight/scrape` endpoint replaces the previous two
near-duplicate scrapers. Mode toggle:
- **`keyword`** — free-text query (e.g. "Starbucks Kuta") → Nominatim geocode
  → bbox Overpass
- **`brand`** — predefined brand catalog → full region bbox Overpass sweep

Both modes accept a hierarchical location filter (`kab_code` / `kec_code` /
`kel_code`) to scope the scrape. Scraper output never writes directly to
master tables; it goes through a staging-table review workflow first.

### 7. Pure-TypeScript ML

The GBR model is implemented in pure TypeScript (`src/lib/ml/gbr.ts`) — no
Python sidecar, no cold-start, no HF dependency for production traffic. The
HF Space exists only as a standalone analytics tool for data scientists who
prefer a Python notebook experience.

### 8. PostGIS geography columns

Every spatial table has a `geom geography(point, 4326)` column generated
from `lat`+`lng`. All proximity queries use `ST_DWithin` for sub-millisecond
performance even at 10 k+ rows. An `is_on_bali_land(lat, lng)` SQL CHECK
constraint rejects coordinates that fall in the ocean — a common OSM
data-quality issue.

---

## Documentation

All docs below are also mirrored into the database by `scripts/seed-docs.ts`
and surfaced in-app at `/docs` (DB-backed, DB-rendered). The markdown files
in this repository are the source of truth.

| Doc | What's inside |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System diagram, request flow, auth flow, tenant switching, RLS policy catalog |
| [`docs/SCRAPER.md`](docs/SCRAPER.md) | How the unified scraper + brand classifier + review workflow works |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Schema, ERD, RLS policy matrix, tenant-scoped vs shared tables |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | SaaS topology, env vars, Vercel + Supabase setup, RLS migration, tenant onboarding |
| [`docs/USER_GUIDE.md`](docs/USER_GUIDE.md) | Login, navigation, tenant switching, Users Management, role-based access |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Release history (latest: v5.0.0 SaaS transformation) |

---

## Related repositories

| Repo | Purpose |
|---|---|
| [`bayhaqy/LocInsights`](https://github.com/bayhaqy/LocInsights) | **This repo** — Next.js frontend + API + SaaS layer |
| [`bayhaqy/Locinsights_db`](https://github.com/bayhaqy/Locinsights_db) | Supabase SQL migrations (incl. `0009_saas_multi_tenant_auth.sql`) + RLS policies + seed data |
| [`Bayhaqy/LocInsights_ml`](https://huggingface.co/spaces/Bayhaqy/LocInsights_ml) | HF Space — PyScript ML explorer (standalone, optional) |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Lucide icons |
| Maps | Leaflet + leaflet.heat + react-leaflet (with GADM GeoJSON) |
| Charts | Recharts |
| Markdown | react-markdown + remark-gfm + rehype-highlight + rehype-raw + highlight.js |
| Auth | **NextAuth v4** + Credentials provider + JWT (30-day, refresh every 24h) + **bcryptjs** (10 rounds) |
| RBAC | 6 roles × 17 menus × 5 actions = 85-cell permission matrix (stored as JSON in `roles.permissions`) |
| Multi-tenant | Shared DB + `tenant_id` on 16 private tables + PostgreSQL RLS via `current_setting('app.current_tenant_id', true)` |
| Backend | Next.js Route Handlers (~50 endpoints: 32 domain + admin + auth + docs) |
| ORM | Prisma 6 (singleton client, PascalCase accessors) |
| Database | Supabase (PostgreSQL 15 + PostGIS + pg_trgm + RLS per-tenant) |
| ML | Pure-TypeScript Gradient Boosted Regressor (Friedman 2001) |
| Data sources | OpenStreetMap (Nominatim + Overpass), BPS, GADM admin boundaries |
| Analytics | **@vercel/analytics** (auto-enabled on Vercel) |
| Hosting | Vercel (frontend + cron) · Supabase (DB) · Hugging Face Spaces (standalone ML) |
| Package manager | Bun 1.3+ (Node 20+ also works) |

---

## Maintained by

**Achmad Bayhaqy** — Data Team, MAP Active Adiperkasa (MAA)
Last updated: 2026-08-13

## License

Apache-2.0 — see [`LICENSE`](LICENSE).
