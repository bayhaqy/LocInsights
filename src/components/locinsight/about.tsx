'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Info, BookOpen, Database, Cpu, GitBranch, Activity, Network,
  Layers, MapPin, Users, Building2, Target,
} from 'lucide-react'

/**
 * About page — consolidates project overview, methodology summary,
 * data sources, and tech stack in one place.
 *
 * Per user request: moved methodology info here so the Methodology page
 * can stay focused on the scoring framework itself.
 */
export function About() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          About LocInsight
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          Location intelligence platform for retail site selection — built for MAP Active Adiperkasa (MAA) Data Team
        </p>
      </div>

      {/* What is LocInsight */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--brand-red)]" />
            What is LocInsight?
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4 text-[13px] leading-relaxed text-[var(--brand-ink)]/85">
          <p>
            LocInsight is an enterprise-grade location intelligence system designed to help MAP Active Adiperkasa (MAA)
            make data-driven retail expansion decisions. It identifies <strong>white-space opportunities</strong> —
            underserved areas where new stores can thrive — and quantifies the revenue potential of each candidate site
            using a combination of composite scoring, the Huff Gravity Model, and Gradient-Boosted Regression (GBR).
          </p>
          <p>
            The platform follows the <strong>3-stage retail site selection framework</strong> recommended by
            industry leaders like OnSpot Data (2026), Placer.ai (2024), Felt.com (2026), and GrowthFactor.ai (2025):
            <strong> (1) Market Identification</strong> — find areas with strong demand signals;
            <strong> (2) Site-level Evaluation</strong> — score each candidate using multi-factor analysis;
            <strong> (3) Post-selection Monitoring</strong> — track performance and adjust the model.
          </p>
          <p>
            Two complementary models power the scoring. <strong>Composite Weighted Scoring</strong> (0–100) is
            transparent and tunable — analysts can adjust weights and immediately see the impact. The
            <strong> Huff Gravity Model</strong> (Huff 1964, validated by MIT in 2021 with transactional data) projects
            market share and revenue by modeling how far customers will travel to a store versus its competitors.
            For revenue prediction, a <strong>Gradient-Boosted Regression</strong> tree ensemble (Friedman 2001) learns
            the non-linear relationships between site features and historical performance.
          </p>
        </CardContent>
      </Card>

      {/* Methodology summary */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--brand-red)]" />
            Methodology Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4 text-[13px] leading-relaxed text-[var(--brand-ink)]/85">
          <p>
            For full formula details and factor breakdowns, see the <strong>Methodology</strong> page.
            Here is the high-level view:
          </p>

          <div className="bg-[var(--brand-ink)] text-white p-4 rounded-md font-mono text-[11px] leading-relaxed overflow-x-auto">
            <div className="text-white/60">{'// Composite Score (0-100)'}</div>
            <div>composite_score =</div>
            <div className="pl-4">0.30 × MarketPotential      <span className="text-[#FFB3B3]">{'// population, density, income'}</span></div>
            <div className="pl-4">0.15 × Accessibility         <span className="text-[#FFB3B3]">{'// transit, road density'}</span></div>
            <div className="pl-4">0.20 × FootTraffic           <span className="text-[#FFB3B3]">{'// mall proximity, POI, tourist'}</span></div>
            <div className="pl-4">0.15 × Competition           <span className="text-[#FFB3B3]">{'// same-brand cannibalization'}</span></div>
            <div className="pl-4">0.10 × Socioeconomic         <span className="text-[#FFB3B3]">{'// income-brand fit, HDI'}</span></div>
            <div className="pl-4">0.10 × NetworkSynergy        <span className="text-[#FFB3B3]">{'// cluster effect'}</span></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <Users className="w-4 h-4 text-[var(--brand-red)] mb-1" />
              <div className="text-[12px] font-bold text-[var(--brand-ink)] mb-1">Market Potential (30%)</div>
              <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">
                Population × 1.4 trade-area catchment, density, GDRP per capita, tourist multiplier for coastal zones.
              </div>
            </div>
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <MapPin className="w-4 h-4 text-[var(--brand-red)] mb-1" />
              <div className="text-[12px] font-bold text-[var(--brand-ink)] mb-1">Foot Traffic (20%)</div>
              <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">
                Mall proximity (decay at 5km), POI density (tourist + beach + hotel + office + university), tourist index.
              </div>
            </div>
            <div className="bg-[var(--brand-cream)] p-3 rounded-md">
              <Building2 className="w-4 h-4 text-[var(--brand-red)] mb-1" />
              <div className="text-[12px] font-bold text-[var(--brand-ink)] mb-1">Competition (15%)</div>
              <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">
                Same-brand within 2km: −60pts (1 store), −100pts (2+ stores). Other-brand saturation: −5pts/store.
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
            Data Sources
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <p className="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed">
            All data comes from public, verifiable sources. Each record in the master database carries a
            <code className="mx-1 px-1.5 py-0.5 bg-[var(--brand-cream)] rounded text-[11px]">source</code> field
            documenting its provenance — so analysts can audit any data point back to the original publication.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DataSource
              title="BPS Bali 2024"
              desc="Population, area, density per kabupaten/kecamatan/kelurahan. GDRP per capita. HDI 2024."
              type="Government Statistics"
            />
            <DataSource
              title="MAP Brand Directory (map.co.id)"
              desc="Verified list of MAP brands by category (F&B, Sports, Fashion, Department Store)."
              type="Company Public"
            />
            <DataSource
              title="MAP Active Brands (mapactive.id)"
              desc="Sports/Leisure/Kids brand portfolio. Cross-referenced with sgbonline.com (2,200+ stores)."
              type="Company Public"
            />
            <DataSource
              title="Bali Mall Catalog"
              desc="Mall names, location, GLA estimates, opening year. Verified against mall official sites."
              type="Travel Directories"
            />
            <DataSource
              title="OpenStreetMap POI"
              desc="Tourist attractions, beaches, temples, hotels, transit hubs, universities, hospitals. ODbL license."
              type="Open Geodata"
            />
            <DataSource
              title="GADM v4.1 Admin Boundaries"
              desc="Real kabupaten & kecamatan polygons used for choropleth heatmap. Public academic-use license."
              type="Open Geodata"
            />
            <DataSource
              title="CARTO Light Basemap"
              desc="Vector tile basemap for visualization. Used in React-Leaflet for clean professional appearance."
              type="Map Tiles"
            />
            <DataSource
              title="Nominatim + Overpass API"
              desc="Live geocoding + POI queries for the data scraper. Rate-limited per OSM usage policy (1 req/sec)."
              type="Live API"
            />
          </div>
        </CardContent>
      </Card>

      {/* Research references */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--brand-red)]" />
            Best Practices & Research References
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <p className="text-[13px] text-[var(--brand-ink)]/85 leading-relaxed mb-3">
            The framework synthesizes peer-reviewed academic research and industry best practices from
            leading location intelligence vendors (2024–2026).
          </p>
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
        </CardContent>
      </Card>

      {/* Capabilities */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--brand-red)]" />
            Platform Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Capability
              icon={MapPin}
              title="Interactive Map Explorer"
              desc="Real GADM admin boundaries (kabupaten + kecamatan) choropleth + point heat. Brand/category/parent filters."
            />
            <Capability
              icon={Target}
              title="Opportunities & Deep Analysis"
              desc="Top expansion sites, per-kelurahan detail, travel-time isochrones, ML revenue projection."
            />
            <Capability
              icon={Users}
              title="Brand Coverage"
              desc="MAP & MAA portfolio distribution. Per-brand gap analysis and recommendations."
            />
            <Capability
              icon={Building2}
              title="Mall Network"
              desc="Mall directory + live tenant audit (OSM Overpass). GLA, class, visitor estimates."
            />
            <Capability
              icon={Activity}
              title="Competitor Intel"
              desc="26 competitor brands tracked (Indomaret, Alfamart, MCD, KFC, etc.). Density heatmap + review-then-save scraper."
            />
            <Capability
              icon={Cpu}
              title="ML / AI Engine"
              desc="Pure-TS Gradient-Boosted Regression (Friedman 2001). Training run audit + per-prediction SHAP contributions."
            />
            <Capability
              icon={Network}
              title="A/B Simulator"
              desc="Tune the 6 scoring weights live. Compare ranking before/after to validate strategic pivots."
            />
            <Capability
              icon={Database}
              title="Data Manager"
              desc="Full CRUD + Excel-like spreadsheet editor. CSV/XLSX import/export with templates."
            />
            <Capability
              icon={GitBranch}
              title="Reports"
              desc="Executive summary, site analysis, brand expansion, regional comparison. HTML/CSV/JSON."
            />
          </div>
        </CardContent>
      </Card>

      {/* Tech stack */}
      <Card className="bg-[var(--brand-ink)] text-white border-0 rounded-xl shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-[var(--brand-red)]" />
            <span className="text-[12px] uppercase tracking-wider font-medium">Tech Stack</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
            <TechItem label="Frontend" value="Next.js 16 + React 19 + TypeScript" />
            <TechItem label="Map" value="React-Leaflet + GADM GeoJSON + heatmap" />
            <TechItem label="UI" value="Tailwind CSS 4 + shadcn/ui" />
            <TechItem label="Backend" value="Next.js API Routes (serverless)" />
            <TechItem label="Database" value="Supabase Postgres + Prisma ORM" />
            <TechItem label="Scoring" value="Composite + Huff Gravity + competitor-aware" />
            <TechItem label="ML" value="Gradient-Boosted Regression (Friedman 2001)" />
            <TechItem label="Deployment" value="Vercel + Hugging Face Spaces" />
          </div>
        </CardContent>
      </Card>

      {/* Maintainer */}
      <Card className="card-premium bg-[var(--brand-cream)]">
        <CardContent className="p-5 text-center">
          <div className="text-[13px] text-[var(--brand-ink)]/85">
            <strong className="text-[var(--brand-ink)]">Maintained by</strong> Achmad Bayhaqy · Data Team, MAP Active Adiperkasa (MAA)
          </div>
          <div className="text-[11px] text-[var(--brand-ink)]/55 mt-1">
            Built with open-source tools · All data from public sources · For internal strategic planning use
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DataSource({ title, desc, type }: { title: string; desc: string; type: string }) {
  return (
    <div className="border border-[var(--brand-border)] rounded-md p-3">
      <div className="flex items-start justify-between mb-1">
        <strong className="text-[12.5px] text-[var(--brand-ink)]">{title}</strong>
        <Badge variant="outline" className="text-[9px] px-1 py-0 border-[var(--brand-red)]/30 text-[var(--brand-red)]">
          {type}
        </Badge>
      </div>
      <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">{desc}</div>
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

function Capability({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="bg-[var(--brand-cream)] rounded-md p-3">
      <Icon className="w-4 h-4 text-[var(--brand-red)] mb-2" />
      <div className="text-[12px] font-bold text-[var(--brand-ink)] mb-1">{title}</div>
      <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">{desc}</div>
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
