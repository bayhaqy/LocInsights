'use client'

import { useState, useEffect } from 'react'
import { Sidebar, type NavItem } from '@/components/locinsight/sidebar'
import { Dashboard } from '@/components/locinsight/dashboard'
import { MapExplorer } from '@/components/locinsight/map-explorer'
import { Opportunities } from '@/components/locinsight/opportunities'
import { Analysis } from '@/components/locinsight/analysis'
import { MallNetwork } from '@/components/locinsight/mall-network'
import { BrandsCoverage } from '@/components/locinsight/brands-coverage'
import { Methodology } from '@/components/locinsight/methodology'
import { Reports } from '@/components/locinsight/reports'
import { DataManager } from '@/components/locinsight/data-manager'
import { Scraper } from '@/components/locinsight/scraper'
import { MLAIEngine } from '@/components/locinsight/ml-ai-engine'
import { CompetitorIntel } from '@/components/locinsight/competitor-intel'
import { ABTestSimulator } from '@/components/locinsight/ab-test-simulator'
import { MallTenants } from '@/components/locinsight/mall-tenants'
import { About } from '@/components/locinsight/about'
import type { OverviewData } from '@/components/locinsight/types'
import {
  LayoutDashboard, Map, Target, Crosshair, Building2, Store, BookOpen,
  FileText, Database, Search, Brain, Shield, GitCompareArrows, StoreIcon, Info,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & KPI' },
  { id: 'map', label: 'Map Explorer', icon: Map, description: 'Peta interaktif + heatmap' },
  { id: 'opportunities', label: 'Opportunities', icon: Target, description: 'Top expansion sites' },
  { id: 'analysis', label: 'Deep Analysis', icon: Crosshair, description: 'Per-kelurahan detail + isochrones' },
  { id: 'brands', label: 'Brand Coverage', icon: Store, description: 'MAP & MAA portfolio' },
  { id: 'malls', label: 'Mall Network', icon: Building2, description: 'Mall tenant coverage' },
  { id: 'competitors', label: 'Competitor Intel', icon: Shield, description: 'Competitor scraping + density' },
  { id: 'ab', label: 'A/B Simulator', icon: GitCompareArrows, description: 'Weight comparison' },
  { id: 'ml', label: 'ML / AI Engine', icon: Brain, description: 'GBR revenue predictor + training' },
  { id: 'mall_tenants', label: 'Mall Tenants', icon: StoreIcon, description: 'Live tenant audit' },
  { id: 'reports', label: 'Reports', icon: FileText, description: 'Export PDF/CSV/JSON' },
  { id: 'data', label: 'Data Manager', icon: Database, description: 'CRUD master data' },
  { id: 'scraper', label: 'Data Scraper', icon: Search, description: 'Auto-scrape OSM data' },
  { id: 'methodology', label: 'Methodology', icon: BookOpen, description: 'Scoring framework & math' },
  { id: 'about', label: 'About', icon: Info, description: 'Project overview & data sources' },
]

export default function Home() {
  const [activeView, setActiveView] = useState('dashboard')
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedKelurahanId, setSelectedKelurahanId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/locinsight/overview')
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setData(j.data)
          if (j.data.top_opportunities?.[0]) {
            setSelectedKelurahanId(j.data.top_opportunities[0].kelurahan_id)
          }
        } else {
          setError(j.error || 'Failed to load')
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen bg-[var(--brand-cream)]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-[var(--brand-red)] text-[14px] font-medium mb-2">Failed to load data</div>
            <div className="text-[12px] text-[var(--brand-ink)]/60">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  // Map click → set selection AND navigate to Deep Analysis
  const handleMapSelect = (id: string) => {
    setSelectedKelurahanId(id)
    setActiveView('analysis')
  }

  return (
    <div className="flex min-h-screen bg-[var(--brand-cream)]">
      <Sidebar
        items={NAV_ITEMS}
        activeId={activeView}
        onSelect={setActiveView}
        stats={{
          total_kelurahan: data.stats.total_kelurahan,
          total_stores: data.stats.total_stores,
          total_malls: data.stats.total_malls,
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      <main className="flex-1 overflow-x-hidden min-w-0">
        <header className="bg-white border-b border-[var(--brand-border)] px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* SINGLE sidebar toggle button — only in page header */}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="p-1.5 rounded-md hover:bg-[var(--brand-cream)] text-[var(--brand-ink)]/70 hover:text-[var(--brand-ink)] transition-colors"
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarCollapsed
                ? <PanelLeftOpen className="w-4 h-4" />
                : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <div className="text-[12px] text-[var(--brand-ink)]/60">
              <span className="text-[var(--brand-ink)]/40">LocInsight /</span>{' '}
              <span className="font-medium text-[var(--brand-ink)] capitalize">
                {NAV_ITEMS.find(n => n.id === activeView)?.label}
              </span>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6">
          {activeView === 'dashboard' && (
            <Dashboard
              stats={data.stats}
              topOpportunities={data.top_opportunities}
              onSelectKelurahan={(id) => { setSelectedKelurahanId(id); setActiveView('analysis') }}
              onNavigate={setActiveView}
            />
          )}
          {activeView === 'map' && (
            <MapExplorer
              opportunities={data.top_opportunities}
              stores={data.stores}
              malls={data.malls}
              pois={data.pois}
              selectedKelurahanId={selectedKelurahanId}
              onSelectKelurahan={handleMapSelect}
              onOpenOpportunities={() => setActiveView('opportunities')}
            />
          )}
          {activeView === 'opportunities' && (
            <Opportunities
              opportunities={data.top_opportunities}
              brands={data.brands}
              selectedKelurahanId={selectedKelurahanId}
              onSelectKelurahan={(id) => { setSelectedKelurahanId(id); setActiveView('analysis') }}
            />
          )}
          {activeView === 'analysis' && (
            <Analysis
              kelurahanList={data.kelurahan}
              brands={data.brands}
              selectedKelurahanId={selectedKelurahanId}
              onSelectKelurahan={setSelectedKelurahanId}
            />
          )}
          {activeView === 'brands' && (
            <BrandsCoverage
              brands={data.brands}
              stores={data.stores}
              onSelectKelurahan={(id) => { setSelectedKelurahanId(id); setActiveView('analysis') }}
            />
          )}
          {activeView === 'malls' && (
            <MallNetwork
              malls={data.malls}
              stores={data.stores}
              brands={data.brands}
              onSelectKelurahan={(id) => { setSelectedKelurahanId(id); setActiveView('analysis') }}
            />
          )}
          {activeView === 'competitors' && <CompetitorIntel onScrapeMore={() => setActiveView('scraper')} />}
          {activeView === 'ab' && <ABTestSimulator />}
          {activeView === 'ml' && <MLAIEngine />}
          {activeView === 'mall_tenants' && <MallTenants malls={data.malls} />}
          {activeView === 'reports' && <Reports />}
          {activeView === 'data' && <DataManager />}
          {activeView === 'scraper' && <Scraper />}
          {activeView === 'methodology' && <Methodology />}
          {activeView === 'about' && <About />}
        </div>

        <footer className="bg-[var(--brand-ink)] text-white/70 text-[11px] px-6 py-4 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong className="text-white">LocInsight</strong> — Location Intelligence for MAP Active Adiperkasa
            </div>
            <div className="text-white/45">
              © {new Date().getFullYear()} · Built by{' '}
              <a
                href="https://bayhaqy.my.id"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white underline-offset-2 hover:underline"
              >
                Achmad Bayhaqy
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

/* ------------------------------------------------------------------
 * LoadingScreen — minimalist animated globe loader.
 * Pure CSS animations, shows a rotating globe SVG + brand wordmark.
 * ---------------------------------------------------------------- */
function LoadingScreen() {
  return (
    <div className="flex min-h-screen bg-[var(--brand-cream)] items-center justify-center">
      <style>{`
        @keyframes locinsight-globe-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes locinsight-globe-spin-reverse {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes locinsight-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.04); }
        }
        @keyframes locinsight-fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes locinsight-dot {
          0%, 80%, 100% { opacity: 0.2; }
          40%           { opacity: 1; }
        }
        .li-globe-ring     { animation: locinsight-globe-spin 8s linear infinite;        transform-origin: center; }
        .li-globe-ring-r   { animation: locinsight-globe-spin-reverse 6s linear infinite; transform-origin: center; }
        .li-globe-core     { animation: locinsight-pulse 3.2s ease-in-out infinite;      transform-origin: center; }
        .li-fade-up        { animation: locinsight-fade-up 0.6s ease-out 0.15s both; }
        .li-dot            { animation: locinsight-dot 1.4s ease-in-out infinite; }
      `}</style>

      <div className="flex flex-col items-center gap-6">
        {/* Globe */}
        <div className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="absolute inset-0 li-globe-ring" aria-hidden="true">
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--brand-red)" strokeWidth="1.2" strokeDasharray="3 6" opacity="0.55" />
          </svg>
          <svg viewBox="0 0 100 100" className="absolute inset-0 li-globe-ring-r" aria-hidden="true">
            <ellipse cx="50" cy="50" rx="34" ry="46" fill="none" stroke="var(--brand-ink)" strokeWidth="1" opacity="0.25" />
            <ellipse cx="50" cy="50" rx="18" ry="46" fill="none" stroke="var(--brand-ink)" strokeWidth="1" opacity="0.18" />
            <line x1="6"  y1="50" x2="94" y2="50" stroke="var(--brand-ink)" strokeWidth="0.8" opacity="0.18" />
            <line x1="14" y1="36" x2="86" y2="36" stroke="var(--brand-ink)" strokeWidth="0.6" opacity="0.12" />
            <line x1="14" y1="64" x2="86" y2="64" stroke="var(--brand-ink)" strokeWidth="0.6" opacity="0.12" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="li-globe-core w-14 h-14 rounded-full flex items-center justify-center font-bold text-[22px] text-white shadow-lg"
              style={{
                background: 'radial-gradient(circle at 35% 30%, #E8324A 0%, #C8102E 45%, #7A0A1A 100%)',
                boxShadow: '0 8px 24px -8px rgba(200, 16, 46, 0.5), inset 0 -6px 12px rgba(0,0,0,0.25)',
              }}
            >
              L
            </div>
          </div>
        </div>

        {/* Wordmark + tagline */}
        <div className="li-fade-up text-center">
          <div className="font-display text-[18px] font-bold text-[var(--brand-ink)] tracking-tight">
            LocInsight
          </div>
          <div className="text-[12px] text-[var(--brand-ink)]/55 mt-1.5 flex items-center justify-center gap-1">
            <span>Loading Location Insights</span>
            <span className="li-dot" style={{ animationDelay: '0s'   }}>.</span>
            <span className="li-dot" style={{ animationDelay: '0.2s' }}>.</span>
            <span className="li-dot" style={{ animationDelay: '0.4s' }}>.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
