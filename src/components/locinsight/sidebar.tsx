'use client'

import { cn } from '@/lib/utils'
import { LucideIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

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
 * Toggle is exposed both internally (chevron button at the top) and externally
 * via the `onToggleCollapse` callback (used by the page header button).
 */
export function Sidebar({ items, activeId, onSelect, collapsed = false, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={cn(
        'bg-[var(--brand-ink)] text-white flex flex-col h-screen sticky top-0 transition-[width] duration-200 ease-in-out z-40',
        collapsed ? 'w-14' : 'w-64'
      )}
    >
      {/* Logo / brand */}
      <div className={cn(
        'border-b border-white/10 flex items-center',
        collapsed ? 'px-2 py-4 justify-center' : 'px-5 pt-6 pb-5 gap-2.5'
      )}>
        <div className="w-9 h-9 rounded-md bg-[var(--brand-red)] flex items-center justify-center font-bold text-lg flex-shrink-0">
          L
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-[17px] leading-tight">LocInsight</div>
            <div className="text-[10px] text-white/50 uppercase tracking-wider">Location Intelligence</div>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Hide sidebar"
            aria-label="Hide sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Collapsed-mode expand button (replaces logo click target) */}
      {collapsed && (
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
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              title={collapsed ? item.label : undefined}
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
                  <div className="text-[13px] font-medium leading-tight">{item.label}</div>
                  <div className={cn(
                    'text-[10.5px] leading-snug mt-0.5',
                    isActive ? 'text-white/80' : 'text-white/40'
                  )}>
                    {item.description}
                  </div>
                </div>
              )}
              {/* Active indicator for collapsed mode */}
              {collapsed && isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer (only in expanded mode — minimal) */}
      {!collapsed && (
        <div className="border-t border-white/10 px-4 py-3">
          <div className="text-[9.5px] text-white/40 leading-relaxed">
            Powered by <span className="text-white/70 font-medium">MAP Active Data Team</span>
          </div>
        </div>
      )}
    </aside>
  )
}
