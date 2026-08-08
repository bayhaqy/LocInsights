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

  const handleSelectKelurahan = (id: string) => {
    setSelectedKelurahanId(id)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[var(--brand-cream)]">
        <div className="w-64 bg-[var(--brand-ink)]" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[var(--brand-red)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-[14px] text-[var(--brand-ink)]/70 font-medium">Loading LocInsight…</div>
            <div className="text-[11px] text-[var(--brand-ink)]/50 mt-1">Computing scores for 172 kelurahan + competitor data…</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen bg-[var(--brand-cream)]">
        <div className="w-64 bg-[var(--brand-ink)]" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-[var(--brand-red)] text-[14px] font-medium mb-2">Failed to load data</div>
            <div className="text-[12px] text-[var(--brand-ink)]/60">{error}</div>
          </div>
        </div>
      </div>
    )
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
      />

      <main className="flex-1 overflow-x-hidden">
        <header className="bg-white border-b border-[var(--brand-border)] px-6 py-3 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[12px] text-[var(--brand-ink)]/60">
              <span className="text-[var(--brand-ink)]/40">LocInsight /</span>{' '}
              <span className="font-medium text-[var(--brand-ink)] capitalize">
                {NAV_ITEMS.find(n => n.id === activeView)?.label}
              </span>
            </div>
          </div>
        </header>

        <div className="p-6">
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
              onSelectKelurahan={handleSelectKelurahan}
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
              onSelectKelurahan={handleSelectKelurahan}
            />
          )}
          {activeView === 'malls' && (
            <MallNetwork
              malls={data.malls}
              stores={data.stores}
              brands={data.brands}
              onSelectKelurahan={handleSelectKelurahan}
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

        <footer className="bg-[var(--brand-ink)] text-white/60 text-[11px] px-6 py-4 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong className="text-white">LocInsight</strong> — Location Intelligence for MAP Active Adiperkasa
            </div>
            <div>
              Next.js 16 + React-Leaflet + Prisma + GBR (Friedman 2001) + Huff Gravity
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
