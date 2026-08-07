'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Layers, BookOpen, Database, Cpu, Target, Activity, Network, GitBranch } from 'lucide-react'

export function Methodology() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          Methodology & Data Sources
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          Best practices location intelligence · composite ML scoring + Huff gravity model
        </p>
      </div>

      {/* Overview */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--brand-red)]" />
            Framework Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4 text-[13px] leading-relaxed text-[var(--brand-ink)]/85">
          <p>
            LocInsight mengadopsi <strong>3-stage framework retail site selection</strong> yang direkomendasikan
            oleh OnSpot Data (Mar 2026) dan Placer.ai (2024): <strong>(1) Market Identification</strong>,
            <strong> (2) Site-level Evaluation</strong>, dan <strong>(3) Post-selection Monitoring</strong>.
            Phase 1 Bali fokus pada tahap 1 & 2 — identifikasi pasar potensial dan evaluasi spesifik per kelurahan.
          </p>
          <p>
            Sistem menggabungkan dua pendekatan komplementer: <strong>composite weighted scoring</strong>
            (multi-faktor 0-100) yang transparan dan dapat di-tune, serta <strong>Huff Gravity Model</strong>
            (spatial interaction) yang memproyeksikan market share dan revenue dengan memodelkan daya tarik
            store vs kompetitor dalam trade area. Pendekatan ini divalidasi oleh MIT (Suhara et al. 2021)
            menggunakan data transaksional besar-besaran dan menjadi standar industri retail.
          </p>
          <p>
            Untuk ekspansi Tier 2-3, sistem secara aktif memberi bobot lebih pada
            <strong> white-space analysis</strong> (kelurahan tanpa toko existing dalam radius 2km)
            dan <strong>early-mover advantage</strong> di area dengan urban index ≥50 tapi belum terlayani.
          </p>
        </CardContent>
      </Card>

      {/* Composite Score formula */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--brand-red)]" />
            Composite Score Formula (0-100)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="bg-[var(--brand-ink)] text-white p-4 rounded-md font-mono text-[11px] leading-relaxed overflow-x-auto">
            <div className="text-white/60">{'// Composite Score (0-100)'}</div>
            <div>composite_score =</div>
            <div className="pl-4">0.30 × MarketPotential +      <span className="text-[#FFB3B3]">{'// population, density, income'}</span></div>
            <div className="pl-4">0.15 × Accessibility +         <span className="text-[#FFB3B3]">{'// transit, road density'}</span></div>
            <div className="pl-4">0.20 × FootTraffic +           <span className="text-[#FFB3B3]">{'// mall proximity, POI, tourist'}</span></div>
            <div className="pl-4">0.15 × Competition +           <span className="text-[#FFB3B3]">{'// same-brand cannibalization'}</span></div>
            <div className="pl-4">0.10 × Socioeconomic +        <span className="text-[#FFB3B3]">{'// income-brand fit, HDI'}</span></div>
            <div className="pl-4">0.10 × NetworkSynergy         <span className="text-[#FFB3B3]">{'// cluster effect'}</span></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            <FactorCard name="Market Potential" weight="30%" desc="Population × 1.4 (trade area catchment), density, parent kabupaten GDRP per capita. Bali context: tourist multiplier untuk coastal + high tourist_index." />
            <FactorCard name="Accessibility" weight="15%" desc="Road density proxy via urban_index, transit hub proximity (airport, port, terminal). Capital city bonus +15." />
            <FactorCard name="Foot Traffic" weight="20%" desc="Nearest mall distance (decay: 0 at 5km+), POI density (tourist attraction + beach + hotel cluster + office + university), tourist index." />
            <FactorCard name="Competition" weight="15%" desc="Same-brand within 2km: 1 store → -60pts, 2+ stores → -100pts (cannibalization). Other brand density: -5pts per store (saturation)." />
            <FactorCard name="Socioeconomic" weight="10%" desc="Brand price-segment vs local income_index match (luxury needs ≥60, mass works anywhere). Tourist area bonus +15." />
            <FactorCard name="Network Synergy" weight="10%" desc="Other MAP stores within 5km: +12pts each (cluster effect). Mall co-location bonus +25 if within 1km." />
          </div>
        </CardContent>
      </Card>

      {/* Huff Model */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Network className="w-4 h-4 text-[var(--brand-red)]" />
            Huff Gravity Model — Market Share & Revenue Projection
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <p className="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed">
            Huff Model (Huff 1964, divalidasi MIT 2021 dengan data transaksional) menghitung probabilitas
            konsumen di zona <em>i</em> memilih toko <em>j</em> berdasarkan daya tarik toko dan jarak.
          </p>

          <div className="bg-[var(--brand-ink)] text-white p-4 rounded-md font-mono text-[11px] leading-relaxed overflow-x-auto">
            <div className="text-white/60">{'// Huff Gravity Model'}</div>
            <div>P(customer at zone i visits store j) =</div>
            <div className="pl-4">A_j / d_ij^λ</div>
            <div className="pl-4">─────────────────────</div>
            <div className="pl-4">Σ_k (A_k / d_ik^λ)</div>
            <div className="mt-3 text-white/60">{'// Where:'}</div>
            <div>A_j = Attractiveness of store j</div>
            <div className="pl-4">= store_size_m² × brand_strength × format_factor × freshness</div>
            <div>d_ij = distance zone i → store j (km, Haversine proxy)</div>
            <div>λ = distance decay (F&B: 1.5, sports: 2.0, fashion: 1.9, dept store: 2.2)</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <div className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-medium mb-1">Attractiveness</div>
              <div className="text-[12px] text-[var(--brand-ink)]/85">
                Store size × brand strength (0.6–0.95) × format factor (Starbucks +25%, Sogo +20%, multi-brand sports +15%).
              </div>
            </div>
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <div className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-medium mb-1">Revenue Projection</div>
              <div className="text-[12px] text-[var(--brand-ink)]/85">
                daily_customers = trade_area_pop × conversion_rate × market_share × tourist_multiplier<br />
                monthly_revenue = daily_customers × avg_ticket_size × 30
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data sources */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Database className="w-4 h-4 text-[var(--brand-red)]" />
            Data Sources & References
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DataSource
              title="BPS Bali 2024"
              desc="Population, area, density per kabupaten/kecamatan/kelurahan. GDRP per capita. HDI 2024."
              type="Government Statistics"
              status="Free / Public"
            />
            <DataSource
              title="MAP Brand Directory (map.co.id/brands)"
              desc="Verified list of MAP brands by category (F&B, Sports, Fashion, Department Store). 25+ brands cataloged."
              type="Company Public"
              status="Free / Public"
            />
            <DataSource
              title="MAP Active Brands (mapactive.id/brands)"
              desc="Sports/Leisure/Kids brand portfolio. 40+ brands. Cross-referenced with sgbonline.com Mar 2026 (2,200+ stores)."
              type="Company Public"
              status="Free / Public"
            />
            <DataSource
              title="Bali Mall Catalog (nowbali.co.id, traveloka.com)"
              desc="Mall names, location, GLA estimates, opening year. Verified Aug 2026 against mall official sites."
              type="Travel Directories"
              status="Free / Public"
            />
            <DataSource
              title="OpenStreetMap POI"
              desc="Tourist attractions, beaches, temples, hotels, transit hubs, universities, hospitals. Coordinates WGS84."
              type="Open Geodata"
              status="Free / Open"
            />
            <DataSource
              title="CARTO Light Basemap"
              desc="Vector tile basemap for visualization. Used in React-Leaflet for clean professional map appearance."
              type="Map Tiles"
              status="Free / Open"
            />
          </div>

          <div className="pt-4 border-t border-[var(--brand-border)]">
            <div className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 font-medium mb-3">Research References — Best Practices 2024-2026</div>
            <div className="space-y-2 text-[11.5px]">
              <Reference title="OnSpot Data — Retail Site Selection Guide" date="Mar 2026" url="onspotdata.com/resources/news-updates/retail-site-selection-guide" />
              <Reference title="Felt.com — Retail location analytics for site selection and network" date="Jun 2026" url="felt.com/blog/retail-location-analytics" />
              <Reference title="GrowthFactor.ai — Quick Start Guide to Site Selection Analytics" date="Aug 2025" url="growthfactor.ai/resources/blog/site-selection-analytics" />
              <Reference title="Targomo — Retail Site Selection with Gravitational Models" date="Sep 2025" url="targomo.com/whitepaper-retail-branch-location-gravitational-models" />
              <Reference title="MIT — Validating Gravity-Based Market Share Models (Suhara et al.)" date="2021" url="dspace.mit.edu/bitstream/handle/1721.1/146605/big.2020.0161.pdf" />
              <Reference title="MDPI ISPRS Int. J. Geo-Inf. — Bibliometric Analysis of Geomarketing (Tudor)" date="2025" url="mdpi.com/2220-9964/14/8/282" />
              <Reference title="Placer.ai — Retail Site Selection Guide (6 Factors)" date="2024" url="placer.ai/guides/retail-site-selection" />
              <Reference title="xmap.ai — 10 Ways Location Intelligence Transforms Retail" date="Jun 2025" url="xmap.ai/blog/10-ways-location-intelligence-can-transform-retail-site-selection" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[var(--brand-red)]" />
            Roadmap & Future Enhancements
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PhaseCard
              phase="Phase 1 (Now)"
              status="active"
              items={[
                'Bali — 9 kab/kota, 47 kec, 172 kelurahan',
                'Composite scoring + Huff gravity model',
                '20 malls, 80 stores, 50+ POIs',
                'React-Leaflet interactive map',
                'Static reference data (JSON)',
              ]}
            />
            <PhaseCard
              phase="Phase 2 (Next Quarter)"
              status="planned"
              items={[
                'Expand to Lombok, Yogyakarta, Surabaya',
                'Real-time travel-time isochrones (GraphHopper/OSRM)',
                'Mobile foot-traffic data (Geolocation API partner)',
                'Competitor brand store scraping',
                'A/B test scoring weights per brand',
              ]}
            />
            <PhaseCard
              phase="Phase 3 (Next Year)"
              status="planned"
              items={[
                'Paid data: Namola, Adsquare, Unacast (foot traffic)',
                'ML prediction (XGBoost) for store revenue',
                'Auto-retrain model with actual sales data',
                'Mall tenant directory integration (live updates)',
                'Mobile app for field surveyors',
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tech stack */}
      <Card className="card-premium bg-[var(--brand-ink)] text-white">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-[var(--brand-red)]" />
            <span className="text-[12px] uppercase tracking-wider font-medium">Tech Stack</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
            <TechItem label="Frontend" value="Next.js 16 + React 19 + TypeScript" />
            <TechItem label="Map" value="React-Leaflet + CARTO basemap" />
            <TechItem label="UI" value="Tailwind CSS 4 + shadcn/ui" />
            <TechItem label="Backend" value="Next.js API Routes (serverless-ready)" />
            <TechItem label="Database" value="Prisma + SQLite (Phase 1) → PostgreSQL (Phase 2)" />
            <TechItem label="Scoring Engine" value="Custom TypeScript — composite + Huff gravity" />
            <TechItem label="ML (Phase 3)" value="Python + scikit-learn + XGBoost via API" />
            <TechItem label="Deployment" value="Vercel / self-hosted Node.js" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FactorCard({ name, weight, desc }: { name: string; weight: string; desc: string }) {
  return (
    <div className="bg-[var(--brand-cream)] rounded-md p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-bold text-[var(--brand-ink)]">{name}</span>
        <span className="text-[11px] font-bold text-[var(--brand-red)] num-tabular">{weight}</span>
      </div>
      <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">{desc}</div>
    </div>
  )
}

function DataSource({ title, desc, type, status }: { title: string; desc: string; type: string; status: string }) {
  return (
    <div className="border border-[var(--brand-border)] rounded-md p-3">
      <div className="flex items-start justify-between mb-1">
        <strong className="text-[12.5px] text-[var(--brand-ink)]">{title}</strong>
        <Badge variant="outline" className="text-[9px] px-1 py-0 border-[var(--brand-red)]/30 text-[var(--brand-red)]">
          {status}
        </Badge>
      </div>
      <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug mb-1.5">{desc}</div>
      <div className="text-[10px] text-[var(--brand-ink)]/50 uppercase tracking-wider">{type}</div>
    </div>
  )
}

function Reference({ title, date, url }: { title: string; date: string; url: string }) {
  return (
    <div className="flex items-start gap-2 text-[var(--brand-ink)]/80">
      <span className="text-[var(--brand-red)] font-bold mt-0.5">▸</span>
      <div className="flex-1">
        <div className="text-[12px]">{title} <span className="text-[var(--brand-ink)]/50">({date})</span></div>
        <div className="text-[10px] text-[var(--brand-ink)]/50 font-mono">{url}</div>
      </div>
    </div>
  )
}

function PhaseCard({ phase, status, items }: { phase: string; status: 'active' | 'planned'; items: string[] }) {
  return (
    <div className={`rounded-md p-3 ${status === 'active' ? 'bg-[var(--brand-red-light)] border border-[var(--brand-red)]/30' : 'bg-[var(--brand-cream)]'}`}>
      <div className="flex items-center justify-between mb-2">
        <strong className="text-[12px] text-[var(--brand-ink)]">{phase}</strong>
        {status === 'active' && (
          <Badge className="text-[9px] px-1.5 py-0 bg-[var(--brand-red)] text-white">CURRENT</Badge>
        )}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-[11px] text-[var(--brand-ink)]/80 leading-snug flex items-start gap-1.5">
            <span className="text-[var(--brand-red)] mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TechItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/50 font-medium mb-0.5">{label}</div>
      <div className="text-[11.5px] text-white/90">{value}</div>
    </div>
  )
}
