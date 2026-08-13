'use client'

import { cn } from '@/lib/utils'
import { LucideIcon, PanelLeftOpen } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/language-provider'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  description: string
}

export interface SidebarProps {
  items: NavItem[]
  activeId: string
  onSelect: (id: string) => void
  stats: {
    total_kelurahan: number
    total_stores: number
    total_malls: number
  }
  collapsed?: boolean
  onToggleCollapse?: () => void
}

/**
 * Sidebar — left navigation.
 *
 * Two states:
 *   • expanded (default, w-64) — full labels + descriptions
 *   • collapsed (w-14)        — icon-only rail for full-screen map viewing
 *
 * IMPORTANT (UX): there is exactly ONE sidebar toggle button — and it lives in
 * the page header. When the sidebar is collapsed, a small floating circular
 * "expand" button appears on the right edge of the rail so the user can bring
 * it back. There is NO internal toggle inside the sidebar header itself,
 * avoiding the duplicate-button confusion reported by users.
 */
export function Sidebar({ items, activeId, onSelect, stats, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { t } = useLanguage()
  return (
    <aside
      className={cn(
        'bg-[var(--brand-ink)] text-white flex flex-col h-screen sticky top-0 self-start transition-[width] duration-200 ease-in-out z-40 relative',
        collapsed ? 'w-14' : 'w-64'
      )}
      style={{ height: '100vh', position: 'sticky', top: 0, alignSelf: 'flex-start' }}
    >
      {/* Logo / brand — no internal toggle button */}
      <div className={cn(
        'border-b border-white/10 flex items-center',
        collapsed ? 'px-2 py-4 justify-center' : 'px-5 pt-5 pb-4 gap-2.5'
      )}>
        {/* New logo: full PNG with transparent background, white-version for dark sidebar */}
        <img
          src="/logo-white.png"
          alt="LocInsights"
          className="flex-shrink-0 object-contain"
          style={{ width: collapsed ? '32px' : '36px', height: collapsed ? '32px' : '36px' }}
          draggable={false}
        />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-[17px] leading-tight">LocInsights</div>
            <div className="text-[10px] text-white/50 uppercase tracking-wider">{t('common.location_intelligence')}</div>
          </div>
        )}
      </div>

      {/* Collapsed-mode expand button — the ONLY in-sidebar toggle (shows when rail is collapsed) */}
      {collapsed && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute top-3 -right-3 w-6 h-6 rounded-full bg-[var(--brand-red)] text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform z-50"
          title="Show sidebar"
          aria-label="Show sidebar"
        >
          <PanelLeftOpen className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Nav */}
      <nav className={cn(
        'flex-1 overflow-y-auto py-3 scroll-styled',
        collapsed ? 'px-1.5 space-y-1' : 'px-2.5'
      )}>
        {items.map(item => {
          const Icon = item.icon
          const isActive = item.id === activeId
          // Labels are stored as i18n keys (e.g. 'nav.dashboard') — translate at render time
          const labelText = t(item.label)
          const descText = t(item.description)
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              title={collapsed ? labelText : undefined}
              className={cn(
                'w-full flex items-center rounded-md text-left transition-all duration-150 group relative',
                collapsed ? 'justify-center p-2.5' : 'items-start gap-3 px-3 py-2.5 mb-0.5',
                isActive
                  ? 'bg-[var(--brand-red)] text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', collapsed ? 'mx-auto' : 'mt-0.5')} />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium leading-tight">{labelText}</div>
                  <div className={cn(
                    'text-[10.5px] leading-snug mt-0.5',
                    isActive ? 'text-white/80' : 'text-white/40'
                  )}>
                    {descText}
                  </div>
                </div>
              )}
              {collapsed && isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer (expanded only — minimal, no totals) */}
      {!collapsed && (
        <div className="border-t border-white/10 px-4 py-3">
          <div className="text-[9.5px] text-white/40 leading-relaxed">
            {t('common.powered_by')} <span className="text-white/70 font-medium">MAP Active Data Team</span>
          </div>
        </div>
      )}
    </aside>
  )
}
