'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Info, BookOpen, Database, Cpu, GitBranch, Activity, Network,
  Layers, MapPin, Users, Building2, Target, Workflow, Sparkles,
  Globe, Github,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-provider'

/**
 * About page — focuses on WHAT the app is, WHY it's useful, and HOW it's built.
 * The scoring math/methods live on the Methodology page (no duplication).
 */
export function About() {
  const { t } = useLanguage()
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          {t('about.title')}
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          {t('about.subtitle')}
        </p>
      </div>

      {/* What is LocInsights */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--brand-red)]" />
            {t('about.what_is')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4 text-[13px] leading-relaxed text-[var(--brand-ink)]/85">
          <p>
            LocInsights is an enterprise-grade location intelligence system designed to help MAP Active Adiperkasa (MAA)
            make data-driven retail expansion decisions. It identifies <strong>white-space opportunities</strong> —
            underserved areas where new stores can thrive — and quantifies the revenue potential of each candidate site
            using a combination of composite scoring, the Huff Gravity Model, and Gradient-Boosted Regression (GBR).
          </p>
          <p>
            The platform is purpose-built for the Indonesian retail context, with Bali as the proof-of-concept region.
            It ingests public data from BPS (statistics), OpenStreetMap (POIs and competitor locations), GADM (administrative
            boundaries), and MAP/MAA's own brand directory — then synthesizes this into actionable expansion recommendations
            that analysts can explore, validate, and refine.
          </p>
        </CardContent>
      </Card>

      {/* Why use it — Use Cases */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--brand-red)]" />
            Why Use LocInsights? — Key Use Cases
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UseCase
              title="White-Space Identification"
              desc="Find underserved kelurahan (villages) where demand signals are strong but MAA/MAP has no presence. Ranked by composite score (0-100)."
            />
            <UseCase
              title="Revenue Projection"
              desc="Estimate daily customers, market share, and monthly revenue for any candidate site — before committing capital. Powered by Huff Gravity Model + GBR."
            />
            <UseCase
              title="Cannibalization Risk Assessment"
              desc="See how a new store would impact existing nearby outlets. The Huff Model automatically captures cannibalization via the distance-decay denominator."
            />
            <UseCase
              title="Competitor Density Analysis"
              desc="887+ competitor outlets tracked (Indomaret, Alfamart, KFC, McDonald's, etc.). Understand saturation levels and competitive intensity per area."
            />
            <UseCase
              title="Tier 2/3 City Expansion"
              desc="Bali's 9 kabupaten span Tier 1 (Badung, Denpasar) to Tier 3 (Jembrana, Bangli, Karangasem). Identify high-potential sites in untapped secondary markets."
            />
            <UseCase
              title="A/B Strategy Simulation"
              desc="Tune the 6 scoring weights live and compare rankings before/after. Validate strategic pivots (e.g. 'what if we prioritize foot traffic over income?')."
            />
          </div>
        </CardContent>
      </Card>

      {/* How it works — Workflow */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Workflow className="w-4 h-4 text-[var(--brand-red)]" />
            How It Works — 3-Stage Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4 text-[13px] leading-relaxed text-[var(--brand-ink)]/85">
          <p>
            LocInsights follows the <strong>3-stage retail site selection framework</strong> recommended by
            industry leaders like OnSpot Data (2026), Placer.ai (2024), Felt.com (2026), and GrowthFactor.ai (2025):
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <WorkflowStage
              stage="1"
              title="Market Identification"
              desc="Find areas with strong demand signals — population density, income, tourist traffic, and competitor gaps. Bali's 716 kelurahan are scored and tiered."
            />
            <WorkflowStage
              stage="2"
              title="Site-Level Evaluation"
              desc="Score each candidate using 6-factor composite analysis + Huff Gravity Model for market share + GBR for revenue prediction. SHAP-style explanations per site."
            />
            <WorkflowStage
              stage="3"
              title="Post-Selection Monitoring"
              desc="Track performance, adjust model weights via A/B Simulator, and re-score as new data arrives. Daily cron keeps competitor and POI data fresh from OSM."
            />
          </div>
          <div className="mt-3 p-3 bg-[var(--brand-cream)] rounded-md text-[12px] text-[var(--brand-ink)]/80">
            <BookOpen className="w-3.5 h-3.5 inline mr-1 text-[var(--brand-red)]" />
            For the detailed scoring formula, factor weights, and model hyperparameters, see the <strong>Methodology</strong> page.
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
              desc="Real GADM admin boundaries (kabupaten + kecamatan) choropleth + point heat. Advanced layers: competitors, tourist POIs, income heatmap, crowd density."
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
              desc="887+ competitor outlets tracked (Indomaret, Alfamart, MCD, KFC, etc.). Density heatmap + review-then-save scraper."
            />
            <Capability
              icon={Cpu}
              title="ML / AI Engine"
              desc="Python Gradient-Boosted Regression (Friedman 2001) running in-browser via Pyodide/HuggingFace Space. Training run audit + per-prediction SHAP contributions."
            />
            <Capability
              icon={Network}
              title="A/B Simulator"
              desc="Tune the 6 scoring weights live. Compare ranking before/after to validate strategic pivots."
            />
            <Capability
              icon={Database}
              title="Data Manager"
              desc="Full CRUD + Excel-like spreadsheet editor for all 8 entity types. CSV/XLSX import/export with templates."
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
            <TechItem label="Database" value="Supabase Postgres + Prisma ORM + PostGIS" />
            <TechItem label="ML Engine" value="Python GBR via Pyodide (HuggingFace Space)" />
            <TechItem label="Scoring" value="Composite + Huff Gravity + competitor-aware" />
            <TechItem label="Deployment" value="Vercel (frontend) + HF Spaces (ML) + Supabase (DB)" />
          </div>
        </CardContent>
      </Card>

      {/* Developer / Author */}
      <Card className="card-premium border-[var(--brand-red)]/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--brand-red)]" />
            Developer & Maintainer
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-display font-bold text-[24px] text-white flex-shrink-0 shadow-md"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #E8324A 0%, #C8102E 45%, #7A0A1A 100%)',
                boxShadow: '0 6px 16px -6px rgba(200, 16, 46, 0.45)',
              }}
              aria-hidden="true"
            >
              AB
            </div>

            {/* Bio */}
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-[var(--brand-ink)] leading-tight">
                Achmad Bayhaqy
              </div>
              <div className="text-[12px] text-[var(--brand-ink)]/70 mt-0.5">
                Developer &amp; Data Engineer · MAP Active Adiperkasa (MAA) Data Team
              </div>
              <p className="text-[12.5px] text-[var(--brand-ink)]/80 leading-relaxed mt-2">
                Designed and built LocInsights end-to-end — from data ingestion and PostGIS schema design through
                composite scoring, Huff gravity modelling, and the GBR revenue predictor. Responsible for the
                continuous data pipeline that keeps competitor, POI, and demographic layers fresh, and for
                evolving the platform as new market signals and brand segments are added.
              </p>

              {/* Links */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <a
                  href="https://bayhaqy.my.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--brand-red)] hover:text-[var(--brand-red-dark)] transition-colors group"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>bayhaqy.my.id</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                </a>
                <span className="text-[var(--brand-border)]">·</span>
                <a
                  href="https://github.com/bayhaqy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--brand-ink)]/70 hover:text-[var(--brand-ink)] transition-colors group"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>github.com/bayhaqy</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--brand-border)] text-[11px] text-[var(--brand-ink)]/55 leading-relaxed">
            Built with open-source tools · All data sourced from public, auditable sources ·
            For internal strategic planning use. For questions, feedback, or contributions,
            reach out via the developer website above.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UseCase({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-[var(--brand-cream)] rounded-md p-3">
      <div className="text-[12px] font-bold text-[var(--brand-ink)] mb-1">{title}</div>
      <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">{desc}</div>
    </div>
  )
}

function WorkflowStage({ stage, title, desc }: { stage: string; title: string; desc: string }) {
  return (
    <div className="border border-[var(--brand-border)] rounded-md p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-6 h-6 rounded-full bg-[var(--brand-red)] text-white text-[11px] font-bold flex items-center justify-center">{stage}</span>
        <span className="text-[12px] font-bold text-[var(--brand-ink)]">{title}</span>
      </div>
      <div className="text-[11px] text-[var(--brand-ink)]/70 leading-snug">{desc}</div>
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
