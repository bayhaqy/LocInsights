'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

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
}

export function Sidebar({ items, activeId, onSelect, stats }: SidebarProps) {
  return (
    <aside className="w-64 bg-[var(--brand-ink)] text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-[var(--brand-red)] flex items-center justify-center font-bold text-lg">
            L
          </div>
          <div>
            <div className="font-display font-bold text-[17px] leading-tight">LocInsight</div>
            <div className="text-[10px] text-white/50 uppercase tracking-wider">Location Intelligence</div>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-white/40 leading-relaxed">
          Powered by <span className="text-white/70 font-medium">MAP Active Data Team</span>
          <br />Phase 1+2+3 · Bali
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 scroll-styled">
        {items.map(item => {
          const Icon = item.icon
          const isActive = item.id === activeId
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-150 mb-0.5 group',
                isActive
                  ? 'bg-[var(--brand-red)] text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium leading-tight">{item.label}</div>
                <div className={cn(
                  'text-[10.5px] leading-snug mt-0.5',
                  isActive ? 'text-white/80' : 'text-white/40'
                )}>
                  {item.description}
                </div>
              </div>
            </button>
          )
        })}
      </nav>

      {/* Footer stats */}
      <div className="border-t border-white/10 px-4 py-4 space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[18px] font-bold text-white num-tabular leading-none">{stats.total_kelurahan}</div>
            <div className="text-[9px] text-white/40 uppercase tracking-wider mt-1">Kelurahan</div>
          </div>
          <div>
            <div className="text-[18px] font-bold text-[var(--brand-red)] num-tabular leading-none">{stats.total_stores}</div>
            <div className="text-[9px] text-white/40 uppercase tracking-wider mt-1">Stores</div>
          </div>
          <div>
            <div className="text-[18px] font-bold text-white num-tabular leading-none">{stats.total_malls}</div>
            <div className="text-[9px] text-white/40 uppercase tracking-wider mt-1">Malls</div>
          </div>
        </div>
        <div className="pt-2 text-[9px] text-white/30 leading-tight text-center">
          Data as of Aug 2026<br />BPS Bali · MAP Public Dir
        </div>
      </div>
    </aside>
  )
}
