/**
 * LocInsights — Public Marketing Landing Page (/)
 *
 * Server component (no 'use client').
 *
 * Sections:
 *   1. Sticky top nav (logo + Sign in CTA)
 *   2. Hero — value proposition + dual CTA (Sign in / Explore demo)
 *   3. Stat strip (key numbers)
 *   4. Features grid — the 16 product modules
 *   5. How it works (3-step workflow)
 *   6. Pricing tiers (Managed SaaS · Enterprise On-Premise · Professional Services)
 *   7. Final CTA
 *   8. Footer (copyright + bayhaqy.my.id link)
 *
 * Brand palette: wine red #7A0A1A + Adiperkasa red #C8102E + ink #0F0F12 + cream #F7F4F0
 */

import Link from 'next/link'
import {
  LayoutDashboard, Map, Target, Crosshair, Store, Building2, Shield,
  GitCompareArrows, Brain, FileText, Database, Search, BookOpen, Info,
  Settings as SettingsIcon, FileQuestion,
  ArrowRight, Check, MapPin, TrendingUp, Zap, Globe2, Server, Lock,
  Sparkles, BarChart3, Layers, Workflow, Cloud, Building,
} from 'lucide-react'

// =====================================================
// Module catalog — 16 modules (excludes admin-only docs/users)
// =====================================================
const MODULES = [
  { icon: LayoutDashboard, name: 'Dashboard',          desc: 'KPI overview & priority heatmap' },
  { icon: Map,             name: 'Map Explorer',       desc: 'Choropleth + 8 layers across 5 region levels' },
  { icon: Target,          name: 'Opportunities',      desc: 'Top expansion sites, composite-scored' },
  { icon: Crosshair,       name: 'Deep Analysis',      desc: 'Per-kelurahan detail with isochrones' },
  { icon: Store,           name: 'Brand Coverage',     desc: 'MAP & MAA portfolio gaps by region' },
  { icon: Building2,       name: 'Mall Network',       desc: 'Anchored-mall analysis + tenant audit' },
  { icon: Shield,          name: 'Competitor Intel',   desc: '833+ competitor stores scraped live from OSM' },
  { icon: GitCompareArrows,name: 'A/B Simulator',      desc: 'Weight comparison & sensitivity analysis' },
  { icon: Brain,           name: 'ML / AI Engine',     desc: 'Gradient Boosted Regressor for revenue' },
  { icon: FileText,        name: 'Reports',            desc: 'PDF / CSV / JSON export, scheduled' },
  { icon: Database,        name: 'Data Manager',       desc: 'CRUD on stores, malls, brands, POIs' },
  { icon: Search,          name: 'Data Scraper',       desc: 'Auto-scrape OSM POIs into staging tables' },
  { icon: BookOpen,        name: 'Methodology',        desc: 'Scoring framework, math, validation' },
  { icon: FileQuestion,    name: 'Documentation',      desc: 'Searchable guides & API references' },
  { icon: Info,            name: 'About',              desc: 'Project overview & data sources' },
  { icon: SettingsIcon,    name: 'Settings',           desc: 'Per-user AI config & preferences' },
] as const

// =====================================================
// Pricing tiers
// =====================================================
const PRICING = [
  {
    name: 'Managed SaaS',
    tagline: 'Cloud-hosted by LocInsights',
    icon: Cloud,
    highlight: false,
    price: 'Rp 25 jt',
    period: '/ bulan',
    altPrice: 'or Rp 250 jt / tahun (2 months free)',
    blurb: 'Fastest way to go live. We host, monitor, and update the platform; you focus on expansion decisions.',
    features: [
      'All 16 modules, always up-to-date',
      'Multi-tenant with role-based access (6 roles)',
      'Bali region data included (716 villages, 57 kecamatan)',
      'Daily auto-scrape of competitor stores from OSM',
      'Up to 10 users per tenant',
      '10,000 API calls / day',
      'Email support (24h response)',
      '99.5% uptime SLA',
    ],
    cta: 'Start with Managed SaaS',
  },
  {
    name: 'Enterprise On-Premise',
    tagline: 'Your cloud, your control',
    icon: Server,
    highlight: true,
    price: 'Rp 450 jt',
    period: ' one-time',
    altPrice: '+ Rp 75 jt setup · Rp 85 jt / year AMC',
    blurb: 'Deploy LocInsights inside your own VPC or on-prem cluster. Full source access, custom integrations, white-label.',
    features: [
      'Everything in Managed SaaS, plus:',
      'Single-tenant deployment in your VPC / on-prem',
      'Full source code & deployment scripts',
      'Custom data pipeline integration (ERP, BI, CRM)',
      'SSO via SAML / OIDC (Okta, Azure AD, Google)',
      'White-label branding (logo, colors, domain)',
      'Unlimited users & API calls (your infra)',
      'Priority support (4h response, dedicated engineer)',
      'Annual Maintenance Contract (AMC) included year 1',
    ],
    cta: 'Talk to sales',
  },
  {
    name: 'Professional Services',
    tagline: 'A la carte add-ons & custom work',
    icon: Workflow,
    highlight: false,
    price: 'Custom',
    period: '',
    altPrice: 'Region expansion · custom scrapers · API connectors · UI',
    blurb: 'Extend LocInsights with new regions, custom data sources, or bespoke UI. Engagements scoped per project.',
    features: [
      'Region expansion — Rp 20 jt / province',
      '  (full admin tree + demographic indices + POIs)',
      'Custom scraper — Rp 25 jt / source',
      '  (e.g. Tokopedia, Shopee, Google Places, Instagram)',
      'API connector — from Rp 75 jt',
      '  (ERP, POS, BI, custom internal APIs)',
      'UI customization — Rp 5 jt / manday',
      '  (custom dashboards, workflows, exports)',
      'ML model retraining — Rp 30 jt / model',
      '  (re-calibrate GBR on your historical revenue)',
      'Quarterly data refresh — Rp 15 jt / quarter',
    ],
    cta: 'Scope a project',
  },
] as const

// =====================================================
// Component
// =====================================================
export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--brand-cream)]">
      {/* ============== 1. STICKY TOP NAV ============== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[var(--brand-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="LocInsights" className="w-8 h-8 object-contain" />
            <div className="font-display font-bold text-[18px] text-[var(--brand-ink)] tracking-tight">
              LocInsights
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-[13px]">
            <a href="#features"  className="text-[var(--brand-ink)]/70 hover:text-[var(--brand-red)] transition-colors">Features</a>
            <a href="#how"       className="text-[var(--brand-ink)]/70 hover:text-[var(--brand-red)] transition-colors">How it works</a>
            <a href="#pricing"   className="text-[var(--brand-ink)]/70 hover:text-[var(--brand-red)] transition-colors">Pricing</a>
            <a
              href="https://bayhaqy.my.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--brand-ink)]/70 hover:text-[var(--brand-red)] transition-colors"
            >
              About
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-1.5 text-[13px] font-medium text-[var(--brand-ink)]/80 hover:text-[var(--brand-ink)] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="px-4 py-1.5 text-[13px] font-medium rounded-md bg-[var(--brand-red)] hover:bg-[var(--brand-ink)] text-white transition-colors inline-flex items-center gap-1.5"
            >
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ============== 2. HERO ============== */}
      <section className="relative overflow-hidden bg-[var(--brand-ink)] text-white">
        {/* Decorative background */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, #C8102E 1.5px, transparent 1.5px), radial-gradient(circle at 75% 75%, #7A0A1A 1.5px, transparent 1.5px)',
            backgroundSize: '56px 56px',
          }}
        />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--brand-red)] rounded-full blur-3xl opacity-20 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-[var(--brand-red)] rounded-full blur-3xl opacity-10 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium uppercase tracking-[0.15em] text-white/80 mb-6">
              <Sparkles className="w-3 h-3 text-[var(--brand-red)]" />
              Location Intelligence for Retail Expansion
            </div>

            <h1 className="font-display text-[42px] sm:text-[56px] lg:text-[64px] leading-[1.05] font-bold tracking-tight mb-6">
              Find your next{' '}
              <span className="text-[var(--brand-red)]">high-potential</span>{' '}
              store location — backed by data, not gut feel.
            </h1>

            <p className="text-[16px] sm:text-[18px] text-white/70 leading-relaxed max-w-2xl mb-10">
              LocInsights combines government data (BPS, KEMENDAGRI), live web
              data (OSM, scrapers), and ML-driven composite scoring to identify
              the optimal kecamatan / kelurahan for your next retail outlet —
              calibrated to your portfolio and competitive landscape.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)] text-white text-[14px] font-semibold transition-colors shadow-lg shadow-[var(--brand-red)]/20"
              >
                Sign in to dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[14px] font-semibold transition-colors"
              >
                Explore features
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl">
              <Stat number="716"     label="Bali villages analyzed" />
              <Stat number="833+"    label="Competitor stores tracked" />
              <Stat number="57"      label="Kecamatan covered" />
              <Stat number="16"      label="Product modules" />
            </div>
          </div>
        </div>
      </section>

      {/* ============== 3. VALUE PROPS STRIP ============== */}
      <section className="bg-white border-b border-[var(--brand-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <ValueProp
            icon={TrendingUp}
            title="Composite ML scoring"
            desc="10 weighted factors per kelurahan — population, income, tourism, transport, POI density, mall proximity, cannibalization risk, and more."
          />
          <ValueProp
            icon={Globe2}
            title="Live data, not stale snapshots"
            desc="Daily OSM scraping + LocationIQ reverse-geocoding keeps competitor and POI data fresh. Government data refreshed annually from BPS."
          />
          <ValueProp
            icon={Lock}
            title="Multi-tenant + RBAC"
            desc="6 system roles, 17 menus × 5 actions permission matrix, per-tenant data isolation. SSO-ready for enterprise."
          />
        </div>
      </section>

      {/* ============== 4. FEATURES GRID ============== */}
      <section id="features" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--brand-red)] font-medium mb-3">
              The platform
            </div>
            <h2 className="font-display text-[34px] sm:text-[42px] font-bold text-[var(--brand-ink)] tracking-tight mb-4">
              16 modules covering the full expansion workflow
            </h2>
            <p className="text-[15px] text-[var(--brand-ink)]/60 leading-relaxed">
              From raw OSM data to ML-driven revenue projections — every step
              of the location intelligence pipeline, in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULES.map(m => {
              const Icon = m.icon
              return (
                <div
                  key={m.name}
                  className="group bg-white border border-[var(--brand-border)] rounded-lg p-5 hover:border-[var(--brand-red)] hover:shadow-lg hover:shadow-[var(--brand-red)]/5 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-md bg-[var(--brand-red)]/8 group-hover:bg-[var(--brand-red)]/15 flex items-center justify-center mb-3.5 transition-colors">
                    <Icon className="w-5 h-5 text-[var(--brand-red)]" />
                  </div>
                  <div className="font-display font-semibold text-[14px] text-[var(--brand-ink)] mb-1">
                    {m.name}
                  </div>
                  <div className="text-[12px] text-[var(--brand-ink)]/55 leading-relaxed">
                    {m.desc}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============== 5. HOW IT WORKS ============== */}
      <section id="how" className="bg-[var(--brand-ink)] text-white py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--brand-red)] font-medium mb-3">
              Workflow
            </div>
            <h2 className="font-display text-[34px] sm:text-[42px] font-bold tracking-tight mb-4">
              Three stages, one decision
            </h2>
            <p className="text-[15px] text-white/60 leading-relaxed">
              From raw data collection to a single composite score you can act on.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Step
              n="01"
              icon={Database}
              title="Ingest & enrich"
              desc="Scrape OSM competitors (833+), pull BPS demographics, reverse-geocode via LocationIQ, and stage everything in PostGIS with RLS."
            />
            <Step
              n="02"
              icon={Layers}
              title="Score & model"
              desc="10-factor composite score per kelurahan + Gradient Boosted Regressor for revenue projection. Re-calibrate on your historical data."
            />
            <Step
              n="03"
              icon={BarChart3}
              title="Decide & export"
              desc="Interactive map, sortable tables, A/B weight comparison, scheduled PDF/CSV/JSON reports — feed your expansion committee."
            />
          </div>
        </div>
      </section>

      {/* ============== 6. PRICING ============== */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--brand-red)] font-medium mb-3">
              Pricing
            </div>
            <h2 className="font-display text-[34px] sm:text-[42px] font-bold text-[var(--brand-ink)] tracking-tight mb-4">
              Pick the deployment that fits your team
            </h2>
            <p className="text-[15px] text-[var(--brand-ink)]/60 leading-relaxed">
              From a single retail brand to a multi-tenant enterprise rollout —
              transparent pricing, no per-seat surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PRICING.map(p => {
              const Icon = p.icon
              return (
                <div
                  key={p.name}
                  className={`relative rounded-2xl border p-7 flex flex-col ${
                    p.highlight
                      ? 'bg-[var(--brand-ink)] text-white border-[var(--brand-ink)] shadow-xl shadow-[var(--brand-ink)]/10 lg:-translate-y-3'
                      : 'bg-white text-[var(--brand-ink)] border-[var(--brand-border)]'
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--brand-red)] text-white text-[10px] font-semibold uppercase tracking-wider">
                      Most flexible
                    </div>
                  )}
                  <div className={`w-11 h-11 rounded-md flex items-center justify-center mb-4 ${
                    p.highlight ? 'bg-[var(--brand-red)]/20' : 'bg-[var(--brand-red)]/10'
                  }`}>
                    <Icon className={`w-5 h-5 ${p.highlight ? 'text-[var(--brand-red)]' : 'text-[var(--brand-red)]'}`} />
                  </div>
                  <div className="font-display font-bold text-[20px] mb-1">{p.name}</div>
                  <div className={`text-[12px] mb-5 ${p.highlight ? 'text-white/60' : 'text-[var(--brand-ink)]/55'}`}>
                    {p.tagline}
                  </div>

                  <div className="mb-2">
                    <span className="font-display font-bold text-[32px] tracking-tight">{p.price}</span>
                    <span className={`text-[14px] ml-1 ${p.highlight ? 'text-white/60' : 'text-[var(--brand-ink)]/55'}`}>
                      {p.period}
                    </span>
                  </div>
                  <div className={`text-[11px] mb-5 ${p.highlight ? 'text-white/50' : 'text-[var(--brand-ink)]/50'}`}>
                    {p.altPrice}
                  </div>

                  <p className={`text-[13px] leading-relaxed mb-6 ${p.highlight ? 'text-white/70' : 'text-[var(--brand-ink)]/65'}`}>
                    {p.blurb}
                  </p>

                  <ul className="space-y-2.5 mb-7 flex-1">
                    {p.features.map((f, i) => (
                      <li key={i} className={`flex items-start gap-2 text-[12.5px] leading-snug ${
                        f.startsWith('  ')
                          ? (p.highlight ? 'text-white/50' : 'text-[var(--brand-ink)]/50')
                          : (p.highlight ? 'text-white/85' : 'text-[var(--brand-ink)]/80')
                      }`}>
                        {!f.startsWith('  ') && (
                          <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${p.highlight ? 'text-[var(--brand-red)]' : 'text-[var(--brand-red)]'}`} />
                        )}
                        <span className={f.startsWith('  ') ? 'pl-4' : ''}>{f.trim()}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/login"
                    className={`block text-center px-4 py-2.5 rounded-md text-[13px] font-semibold transition-colors ${
                      p.highlight
                        ? 'bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)] text-white'
                        : 'bg-[var(--brand-ink)] hover:bg-[var(--brand-red)] text-white'
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              )
            })}
          </div>

          <p className="text-center text-[12px] text-[var(--brand-ink)]/45 mt-10">
            All prices in Indonesian Rupiah (IDR), excl. VAT. Demo tenants
            available — contact{' '}
            <a
              href="https://bayhaqy.my.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--brand-red)] hover:underline"
            >
              Achmad Bayhaqy
            </a>{' '}
            to scope a pilot.
          </p>
        </div>
      </section>

      {/* ============== 7. FINAL CTA ============== */}
      <section className="bg-[var(--brand-red)] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-[30px] sm:text-[38px] font-bold tracking-tight mb-4">
            Ready to find your next store?
          </h2>
          <p className="text-[15px] text-white/85 leading-relaxed max-w-2xl mx-auto mb-8">
            Sign in with a demo account to explore the full platform, or
            contact us to scope a pilot with your real portfolio data.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-white text-[var(--brand-red)] text-[14px] font-semibold hover:bg-[var(--brand-cream)] transition-colors"
            >
              Sign in
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://bayhaqy.my.id"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-white/10 hover:bg-white/15 border border-white/30 text-white text-[14px] font-semibold transition-colors"
            >
              Contact sales
            </a>
          </div>
        </div>
      </section>

      {/* ============== 8. FOOTER ============== */}
      <footer className="bg-[var(--brand-ink)] text-white/70 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/logo-white.png" alt="LocInsights" className="w-8 h-8 object-contain" />
                <div className="font-display font-bold text-[18px] text-white tracking-tight">
                  LocInsights
                </div>
              </div>
              <p className="text-[13px] leading-relaxed max-w-md">
                SaaS location intelligence platform for retail store expansion.
                Multi-tenant, role-based, calibrated for the Indonesian market.
              </p>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40 font-medium mb-3">
                Product
              </div>
              <ul className="space-y-2 text-[13px]">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing"  className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Sign in</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/40 font-medium mb-3">
                Resources
              </div>
              <ul className="space-y-2 text-[13px]">
                <li><a href="https://bayhaqy.my.id" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">About the author</a></li>
                <li><a href="https://github.com/bayhaqy/LocInsights" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="https://locinsights.bayhaqy.my.id" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Live demo</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-3 text-[12px]">
            <div>
              © {new Date().getFullYear()} LocInsights · Built by{' '}
              <a
                href="https://bayhaqy.my.id"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/85 hover:text-white underline-offset-2 hover:underline"
              >
                Achmad Bayhaqy
              </a>
            </div>
            <div className="text-white/40">
              Apache-2.0 licensed · Powered by Next.js, Prisma, PostGIS, and Leaflet
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// =====================================================
// Small presentational components
// =====================================================
function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="font-display font-bold text-[28px] sm:text-[32px] text-white tracking-tight">
        {number}
      </div>
      <div className="text-[12px] text-white/55 leading-snug mt-1">{label}</div>
    </div>
  )
}

function ValueProp({
  icon: Icon, title, desc,
}: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-11 h-11 rounded-md bg-[var(--brand-red)]/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[var(--brand-red)]" />
      </div>
      <div>
        <div className="font-display font-semibold text-[15px] text-[var(--brand-ink)] mb-1.5">
          {title}
        </div>
        <div className="text-[13px] text-[var(--brand-ink)]/60 leading-relaxed">
          {desc}
        </div>
      </div>
    </div>
  )
}

function Step({
  n, icon: Icon, title, desc,
}: { n: string; icon: any; title: string; desc: string }) {
  return (
    <div className="relative bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="absolute top-4 right-5 font-display font-bold text-[44px] text-white/8 leading-none">
        {n}
      </div>
      <div className="w-11 h-11 rounded-md bg-[var(--brand-red)]/20 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[var(--brand-red)]" />
      </div>
      <div className="font-display font-semibold text-[17px] text-white mb-2">
        {title}
      </div>
      <div className="text-[13px] text-white/65 leading-relaxed">
        {desc}
      </div>
    </div>
  )
}
