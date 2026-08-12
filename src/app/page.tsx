'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
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
import { Documentation } from '@/components/locinsight/documentation'
import { AIChat } from '@/components/locinsight/ai-chat'
import { LanguageSwitcher } from '@/components/locinsight/language-switcher'
import { InstallPrompt } from '@/components/locinsight/install-prompt'
import { Settings } from '@/components/locinsight/settings'
import { UserManagement } from '@/components/locinsight/user-management'
import { useLanguage } from '@/lib/i18n/language-provider'
import type { OverviewData } from '@/components/locinsight/types'
import {
  LayoutDashboard, Map, Target, Crosshair, Building2, Store, BookOpen,
  FileText, Database, Search, Brain, Shield, GitCompareArrows, StoreIcon, Info,
  PanelLeftClose, PanelLeftOpen, Settings as SettingsIcon, HelpCircle,
  LogIn, LogOut, ShieldCheck, Users as UsersIcon,
} from 'lucide-react'

// All nav items — admin-only items are flagged via `adminOnly: true`
// and filtered out when the user is not authenticated as superadmin.
const ALL_NAV_ITEMS: (NavItem & { adminOnly?: boolean })[] = [
  { id: 'dashboard', label: 'nav.dashboard', icon: LayoutDashboard, description: 'nav.dashboard.desc' },
  { id: 'map', label: 'nav.map', icon: Map, description: 'nav.map.desc' },
  { id: 'opportunities', label: 'nav.opportunities', icon: Target, description: 'nav.opportunities.desc' },
  { id: 'analysis', label: 'nav.analysis', icon: Crosshair, description: 'nav.analysis.desc' },
  { id: 'brands', label: 'nav.brands', icon: Store, description: 'nav.brands.desc' },
  { id: 'malls', label: 'nav.malls', icon: Building2, description: 'nav.malls.desc' },
  { id: 'competitors', label: 'nav.competitors', icon: Shield, description: 'nav.competitors.desc' },
  { id: 'ab', label: 'nav.ab', icon: GitCompareArrows, description: 'nav.ab.desc' },
  { id: 'ml', label: 'nav.ml', icon: Brain, description: 'nav.ml.desc' },
  { id: 'mall_tenants', label: 'nav.mall_tenants', icon: StoreIcon, description: 'nav.mall_tenants.desc' },
  { id: 'reports', label: 'nav.reports', icon: FileText, description: 'nav.reports.desc' },
  // Admin-only: Data Manager (CRUD on master data) — requires login
  { id: 'data', label: 'nav.data', icon: Database, description: 'nav.data.desc', adminOnly: true },
  // Admin-only: Scraper (OSM Overpass trigger) — requires login
  { id: 'scraper', label: 'nav.scraper', icon: Search, description: 'nav.scraper.desc', adminOnly: true },
  { id: 'methodology', label: 'nav.methodology', icon: BookOpen, description: 'nav.methodology.desc' },
  { id: 'docs', label: 'nav.docs', icon: HelpCircle, description: 'nav.docs.desc' },
  { id: 'about', label: 'nav.about', icon: Info, description: 'nav.about.desc' },
  // Admin-only: Settings (AI config, map tiles) — requires login
  { id: 'settings', label: 'nav.settings', icon: SettingsIcon, description: 'nav.settings.desc', adminOnly: true },
  // Admin-only: User & Role Management (superadmin only)
  { id: 'users', label: 'nav.users', icon: UsersIcon, description: 'nav.users.desc', adminOnly: true },
]

export default function Home() {
  const { t } = useLanguage()
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === 'superadmin'
  const [activeView, setActiveView] = useState('dashboard')
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedKelurahanId, setSelectedKelurahanId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Filter nav items by role — admin-only items hidden when not authenticated.
  // Per user request (Aug 2026): "jangan tampilkan keseluruhan akses websitenya/reponya"
  // (don't show full access to the website/repo for non-logged-in users).
  const NAV_ITEMS = useMemo(() => {
    return ALL_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)
  }, [isAdmin])

  // === Strict auth gate (Aug 2026) ===
  // Middleware already redirects unauthenticated users to /login server-side,
  // but we double-check client-side too so the app shell never flashes for
  // unauthenticated users (e.g., during session hydration race conditions).
  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/login?callbackUrl=' + encodeURIComponent(window.location.pathname)
    }
  }, [status])

  // If the current active view is admin-only and the user just logged out,
  // gracefully fall back to dashboard.
  useEffect(() => {
    if (status === 'unauthenticated') {
      const current = ALL_NAV_ITEMS.find(i => i.id === activeView)
      if (current?.adminOnly) setActiveView('dashboard')
    }
  }, [status, activeView])

  useEffect(() => {
    // Don't fetch overview until we know the user is authenticated.
    if (status !== 'authenticated') return
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
  }, [status])

  // Show loading screen while session is being verified.
  // This prevents the app shell from flashing before the auth gate resolves.
  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return <LoadingScreen />
  }

  // If unauthenticated (shouldn't happen — middleware redirects — but be safe)
  if (status === 'unauthenticated') {
    return <LoadingScreen />
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen bg-[var(--brand-cream)]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-[var(--brand-red)] text-[14px] font-medium mb-2">{t('common.error')}</div>
            <div className="text-[12px] text-[var(--brand-ink)]/60">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  // Map click → ONLY update selection (stay on Map Explorer so user sees the Selected card update).
  // Auto-navigation to Deep Analysis is removed per user request — user wants to see the
  // selection change in-place, then choose to navigate via the Selected card or sidebar.
  // Empty string / null → clear the selection (so the All Indicators table shows all rows).
  const handleMapSelect = (id: string) => {
    setSelectedKelurahanId(id || null)
  }

  return (
    <div className="flex min-h-screen bg-[var(--brand-cream)] items-stretch">
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

      <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
        <header className="bg-white border-b border-[var(--brand-border)] px-4 sm:px-6 py-3 sticky top-0 z-30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* SINGLE sidebar toggle button — only in page header */}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="p-1.5 rounded-md hover:bg-[var(--brand-cream)] text-[var(--brand-ink)]/70 hover:text-[var(--brand-ink)] transition-colors flex-shrink-0"
              title={sidebarCollapsed ? t('header.show_sidebar') : t('header.hide_sidebar')}
              aria-label={sidebarCollapsed ? t('header.show_sidebar') : t('header.hide_sidebar')}
            >
              {sidebarCollapsed
                ? <PanelLeftOpen className="w-4 h-4" />
                : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <div className="text-[12px] text-[var(--brand-ink)]/60 truncate">
              <span className="text-[var(--brand-ink)]/40">LocInsight /</span>{' '}
              <span className="font-medium text-[var(--brand-ink)]">
                {t(NAV_ITEMS.find(n => n.id === activeView)?.label || '')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <InstallPrompt />
            <LanguageSwitcher />
            {/* Logout button — user is always authenticated at this point (middleware enforces auth) */}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-[var(--brand-ink)]/70 hover:text-[var(--brand-red)] hover:bg-[var(--brand-cream)] transition-colors border border-[var(--brand-border)]"
              title={`Signed in as ${session?.user?.name}${isAdmin ? ' (superadmin)' : ''}. Click to logout.`}
            >
              {isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-[var(--brand-red)]" /> : <LogIn className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{session?.user?.name}</span>
              <LogOut className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 flex-1">
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
              onOpenAnalysis={() => setActiveView('analysis')}
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
          {activeView === 'docs' && <Documentation />}
          {activeView === 'about' && <About />}
          {activeView === 'settings' && <Settings />}
          {activeView === 'users' && <UserManagement />}
        </div>

        <footer className="bg-[var(--brand-ink)] text-white/70 text-[11px] px-6 py-4 mt-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img src="/logo-white.png" alt="LocInsight" className="w-5 h-5 object-contain" />
              <strong className="text-white">LocInsight</strong> — {t('common.location_intelligence')} for MAP Active Adiperkasa
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

      {/* Floating AI Chat — visible on ALL tabs */}
      <AIChat />
    </div>
  )
}

/* ------------------------------------------------------------------
 * LoadingScreen — minimalist animated globe loader.
 * Pure CSS animations, shows a rotating globe SVG + brand wordmark.
 * ---------------------------------------------------------------- */
function LoadingScreen() {
  const { t } = useLanguage()
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
              className="li-globe-core w-16 h-16 rounded-full flex items-center justify-center shadow-lg overflow-hidden bg-white"
              style={{
                boxShadow: '0 8px 24px -8px rgba(200, 16, 46, 0.5), inset 0 -6px 12px rgba(0,0,0,0.25)',
              }}
            >
              <img src="/logo-icon.png" alt="LocInsight" className="w-12 h-12 object-contain" draggable={false} />
            </div>
          </div>
        </div>

        {/* Wordmark + tagline */}
        <div className="li-fade-up text-center">
          <div className="font-display text-[18px] font-bold text-[var(--brand-ink)] tracking-tight">
            LocInsight
          </div>
          <div className="text-[12px] text-[var(--brand-ink)]/55 mt-1.5 flex items-center justify-center gap-1">
            <span>{t('loading.message')}</span>
            <span className="li-dot" style={{ animationDelay: '0s'   }}>.</span>
            <span className="li-dot" style={{ animationDelay: '0.2s' }}>.</span>
            <span className="li-dot" style={{ animationDelay: '0.4s' }}>.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
