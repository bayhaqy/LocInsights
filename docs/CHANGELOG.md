# Changelog

All notable changes to LocInsight are documented here. Dates are in
`YYYY-MM-DD` format. Versions follow [Semantic Versioning](https://semver.org/).

## [4.0.0] — 2026-08-09

### Repository cleanup (this release)

- **New custom domain**: production now served at `https://locinsights.bayhaqy.my.id`
  (was `https://locinsights.vercel.app`).
- **Removed redundant scraper routes**: deleted
  `/api/locinsight/scrape-competitors` and `/api/locinsight/scrape-competitors-save`
  (they were near-duplicates of `/scrape` and `/scrape-save`). The Competitor
  Intel tab now uses `/api/locinsight/competitors?all=true` for listing.
- **Fixed `next.config.ts`**: removed `typescript.ignoreBuildErrors: true`
  (was masking real type errors) and `reactStrictMode: false`. Production builds
  are now type-safe and strict-mode-enabled.
- **Fixed Vercel cron schedule**: was `0 8 * * *` (once daily), now `*/15 * * * *`
  (every 15 min) per the anti-sleep design.
- **Cleaned up `package.json`**: removed 9 unused dependencies
  (`react-day-picker`, `embla-carousel-react`, `input-otp`, `react-hook-form`,
  `@hookform/resolvers`, `cmdk`, `vaul`, `react-resizable-panels`, `sharp`).
  Added `engines.node` constraint and a `typecheck` script.
- **Fixed `tsconfig.json`**: explicitly include only `src/`, exclude `scripts/`,
  `skills/`, `examples/`, `tests/`, `hf-space/`. Eliminates 16 spurious type
  errors from non-app directories.
- **Fixed pre-existing type errors**: 16 errors across `field-survey/route.ts`,
  `mall-tenants/route.ts`, `ml/route.ts`, `ml/train/route.ts` that were masked
  by `ignoreBuildErrors: true`. Now `tsc --noEmit` is clean.
- **Added documentation**: `README.md` (root) + `docs/ARCHITECTURE.md` +
  `docs/SCRAPER.md` + `docs/DATA_MODEL.md` + `docs/DEPLOYMENT.md` +
  `docs/CHANGELOG.md`.
- **Added `LICENSE`** (Apache-2.0).

### From 3.0.0 (previous release)

- Unified scraper (single endpoint replaces two near-duplicates)
- Hierarchical location filter (Bali → Kab → Kec → Kel)
- Brand classifier (prevents competitor pollution of master `stores` table)
- Per-request cache for reverse-geocoding (fixes Vercel 60 s timeout)
- Real GADM GeoJSON for kabupaten/kecamatan choropleth
- About page (moved methodology + scope text out of header)
- Removed Field Surveys from sidebar (kept as PWA at `/survey`)
- HF Space switched to PyScript (Gradio Lite couldn't load scikit-learn)

## [3.0.0] — 2026-08-08

- 8 user-reported bugs fixed (heatmap, GBR train, sidebar text, etc.)
- Competitor Intel tab simplified to data viewer (scraping routed through
  unified scraper)
- Map choropleth uses real GADM admin boundaries with ColorBrewer YlOrRd
  7-step scale + quantile classification

## [2.0.0] — 2026-07-XX

- Initial Vercel + Supabase + HF Space deployment
- 27 MAA/MAP brands, 18 malls, 25 POIs, 172 kelurahan seeded
- AG Grid-style Data Manager with inline editing
- ML/AI Engine tab with GBR training pipeline
- A/B Simulator
- Field Survey PWA at `/survey`

## [1.0.0] — 2026-06-XX

- Initial PoC: pure TypeScript frontend + SQLite (no Supabase, no ML, no scraper)
- Dashboard + Map + Opportunities only
