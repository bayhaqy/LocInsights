# Deployment

> How to deploy LocInsight from scratch. Assumes you have Vercel, Supabase, and
> Hugging Face accounts.

## Architecture recap

```
Browser → Vercel (Next.js) → Supabase (Postgres+PostGIS)
                ↓
        HF Space (standalone ML explorer — optional, not in prod path)
```

## 1. Supabase setup

### 1.1 Create a project

1. Go to https://supabase.com/dashboard → New Project
2. Pick a name (e.g., `locinsight-prod`), set a strong DB password
3. Region: **Singapore** (closest to Bali/Indonesia users)
4. Plan: Free (sufficient for PoC)

### 1.2 Apply database migrations

Clone the [`Locinsights_db`](https://github.com/bayhaqy/Locinsights_db) repo and
apply migrations in order. Easiest: paste each SQL file into Supabase SQL Editor.

```bash
git clone https://github.com/bayhaqy/Locinsights_db.git
cd Locinsights_db
# Apply 0001 → 0006 in order via Supabase SQL Editor
```

See [`Locinsights_db/README.md`](https://github.com/bayhaqy/Locinsights_db) for
automated options (psql or REST API).

### 1.3 Get connection strings

In Supabase Dashboard → Settings → Database → Connection string:

- **Transaction pooler** (port 6543, with `?pgbouncer=true`) → use as `DATABASE_URL`
- **Session pooler** (port 5432) → use as `DIRECT_URL` (for Prisma migrations)

Format:
```
postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 1.4 Get API keys

In Supabase Dashboard → Settings → API:

- `sb_publishable_...` (anon key) — safe to expose client-side
- `sb_secret_...` (service_role key) — **server-only**, never expose

## 2. Vercel setup

### 2.1 Import the GitHub repo

1. Push this repo to `github.com/<you>/LocInsights`
2. Go to https://vercel.com/new → Import the repo
3. Framework preset: **Next.js** (auto-detected)
4. Build command: `next build` (auto)
5. Output directory: `.next` (auto)
6. Install command: `bun install` (or `npm install`)

### 2.2 Set environment variables

In Vercel → Project → Settings → Environment Variables:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...pooler.supabase.com:6543/...?pgbouncer=true` | Transaction pooler |
| `DIRECT_URL` | `postgresql://...pooler.supabase.com:5432/...` | Session pooler (Prisma migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[project-ref].supabase.co` | Optional — only if client uses Supabase JS directly |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` | Optional — same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | Server-only |
| `HF_SPACE_URL` | `https://bayhaqy-locinsights-ml.static.hf.space` | For anti-sleep cron |

### 2.3 Add custom domain

1. Vercel → Project → Settings → Domains → Add
2. Enter `locinsights.bayhaqy.my.id` (or your domain)
3. Vercel shows the DNS records to add:
   - **CNAME** `locinsights` → `cname.vercel-dns.com` (or A record to `76.76.21.21`)
4. Wait for DNS to propagate (5–60 min)
5. Vercel auto-issues a TLS cert via Let's Encrypt

### 2.4 Configure cron

The `vercel.json` already declares the cron:

```json
"crons": [{ "path": "/api/cron/anti-sleep", "schedule": "*/15 * * * *" }]
```

Vercel crons run on the free plan with a 2-week daily limit. The anti-sleep
cron pings:
- The HF Space `/health` endpoint
- Supabase `SELECT 1`

No CRON_SECRET is set by default — the endpoint is read-only and harmless.

### 2.5 Deploy

Push to `main` → Vercel auto-builds and deploys.

Production URL after custom domain: **https://locinsights.bayhaqy.my.id**

## 3. Hugging Face Space setup (optional)

The HF Space is a **standalone ML explorer** — analysts can run ad-hoc predictions
outside the main app. It is NOT in the production request path.

### 3.1 Create the Space

1. Go to https://huggingface.co/new-space
2. Name: `LocInsights_ml`
3. SDK: **Static** (free, no compute quota needed)
4. License: Apache-2.0

### 3.2 Push the code

```bash
cd hf-space/LocInsights_ml
git remote add origin https://huggingface.co/spaces/<you>/LocInsights_ml
git push -u origin main
```

HF auto-rebuilds on every push. The Space is served at:
`https://<you>-locinsights-ml.static.hf.space`

### 3.3 Verify

Open the Space URL — should show the LocInsight ML Engine UI with:
- Health Check tab (Supabase connection status)
- Predict Site Score tab
- Find Blank Spots tab
- Train GBR Model tab (in-browser scikit-learn via Pyodide)
- Data Explorer tab
- About tab

## 4. Anti-sleep cron

Both Supabase and HF Spaces have idle-shutdown behaviors on free tiers:

- **Supabase**: Free-tier project pauses after 7 days of inactivity
- **HF Spaces**: Free static Spaces don't sleep (no compute quota needed)

The `/api/cron/anti-sleep` endpoint runs every 15 min and:
1. `SELECT 1` on Supabase (keeps connection pool warm)
2. `GET /health` on the HF Space (verifies it's alive)
3. Logs the result

If the HF Space goes down, the main app continues to work — it has its own
in-process TypeScript ML engine as a fallback.

## 5. Local development

### 5.1 Prerequisites

- **Bun ≥ 1.3** (preferred) or Node.js ≥ 20
- A Supabase project (or local Postgres + PostGIS — see below)

### 5.2 Local Postgres alternative

If you want a local DB instead of Supabase:

```bash
docker run -d --name locinsight-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=locinsight \
  -p 5432:5432 \
  postgis/postgis:15-3.4

# Set .env:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/locinsight"
# DIRECT_URL="postgresql://postgres:postgres@localhost:5432/locinsight"

# Apply migrations:
psql $DATABASE_URL -f ../Locinsights_db/migrations/0001_init_extensions_and_enums.sql
psql $DATABASE_URL -f ../Locinsights_db/migrations/0002_master_data.sql
# ... continue for 0003-0006
```

### 5.3 Install + run

```bash
bun install
bun run db:generate      # Generate Prisma client
bun run db:push          # Push schema (alternative to migrations)
bun run seed             # Seed Bali data
bun run dev              # http://localhost:3000
```

## 6. CI/CD

Currently using Vercel's GitHub integration (auto-deploy on push to `main`).

For a more robust CI pipeline, add a GitHub Action:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run typecheck
      - run: bun run build
```

## 7. Monitoring

- **Vercel Analytics** — auto-enabled, free tier covers PoC traffic
- **Supabase Logs** — Dashboard → Logs → Postgres logs (slow queries)
- **Sentry** — not configured yet (add `@sentry/nextjs` if needed)

## 8. Backup

Supabase free tier does daily automatic backups (7-day retention). For
additional safety, use the `backup.sh` script in `Locinsights_db/scripts/`:

```bash
# Set these env vars first:
# SUPABASE_DB_URL=postgresql://...
# BACKUP_DIR=/backups/locinsight

./Locinsights_db/scripts/backup.sh
```

This dumps the full DB to a timestamped `.sql.gz` file. Schedule via cron.
