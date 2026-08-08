'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Search, Filter, Shield, MapPin, RefreshCw, Trash2, ArrowRight,
} from 'lucide-react'

interface CompetitorRow {
  id: string
  brand_name: string
  brand_category: string
  name: string
  lat: number
  lng: number
  kec: string
  kab: string
  city: string
  address: string
  is_in_mall: boolean
  mall_name: string | null
  source: string
}

interface Props {
  /** Optional callback when user clicks "Scrape More" — navigates to the unified scraper */
  onScrapeMore?: () => void
}

export function CompetitorIntel({ onScrapeMore }: Props) {
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ brand: '', kab: '' })

  useEffect(() => {
    loadExisting()
  }, [])

  async function loadExisting() {
    setLoading(true)
    try {
      // Use the proper CRUD endpoint (paginated, supports search/filter).
      // Old code used /scrape-competitors which was deleted during the V4 cleanup.
      const res = await fetch('/api/locinsight/competitors?all=true')
      const json = await res.json()
      if (json.success) setCompetitors(json.data || [])
      else toast.error(json.error || 'Failed to load')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteRow(id: string) {
    if (!confirm('Delete this competitor record?')) return
    try {
      const res = await fetch(`/api/locinsight/competitors/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Deleted')
        setCompetitors(prev => prev.filter(c => c.id !== id))
      } else {
        toast.error(json.error || 'Delete failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const filtered = competitors.filter(c => {
    if (filter.brand && c.brand_name !== filter.brand) return false
    if (filter.kab && !c.kab.toLowerCase().includes(filter.kab.toLowerCase())) return false
    return true
  })

  const brandsInDb = Array.from(new Set(competitors.map(c => c.brand_name)))
  const byBrand = brandsInDb.map(b => ({
    brand: b,
    count: competitors.filter(c => c.brand_name === b).length,
  })).sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          Competitor Intelligence
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          View competitor store presence (Indomaret, Alfamart, McDonald's, etc.) scraped from OpenStreetMap. To scrape new data, use the unified Data Scraper — it routes scraped brands automatically: MAA/MAP brands go to the master stores table, all other brands land here.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60">Total Competitors</div>
            <div className="font-display text-[28px] font-bold text-[var(--brand-red)]">{competitors.length}</div>
          </CardContent>
        </Card>
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60">Brands Tracked</div>
            <div className="font-display text-[28px] font-bold text-[var(--brand-ink)]">{brandsInDb.length}</div>
          </CardContent>
        </Card>
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60">In Malls</div>
            <div className="font-display text-[28px] font-bold text-[var(--brand-ink)]">{competitors.filter(c => c.is_in_mall).length}</div>
          </CardContent>
        </Card>
        <Card className="card-premium">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60">Kabupaten</div>
            <div className="font-display text-[28px] font-bold text-[var(--brand-ink)]">{new Set(competitors.map(c => c.kab)).size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top brands */}
      <Card className="card-premium">
        <CardHeader className="pb-2">
          <CardTitle className="text-[12px] uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--brand-red)]" /> Top Competitor Brands
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {byBrand.length === 0 ? (
            <div className="text-[12px] text-[var(--brand-ink)]/50 py-6 text-center">
              No competitor data yet. Click "Scrape More" to fetch from OSM.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {byBrand.slice(0, 12).map(b => (
                <div key={b.brand} className="bg-[var(--brand-cream)] p-2 rounded">
                  <div className="text-[11px] font-medium text-[var(--brand-ink)] truncate">{b.brand}</div>
                  <div className="text-[18px] font-bold text-[var(--brand-red)] num-tabular">{b.count}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="card-premium">
        <CardContent className="p-3 flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60 block mb-1">Brand</label>
            <select
              value={filter.brand}
              onChange={e => setFilter(f => ({ ...f, brand: e.target.value }))}
              className="text-[12px] px-2 py-1.5 border border-[var(--brand-border)] rounded"
            >
              <option value="">All brands</option>
              {brandsInDb.sort().map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60 block mb-1">Kabupaten</label>
            <input
              type="text"
              value={filter.kab}
              onChange={e => setFilter(f => ({ ...f, kab: e.target.value }))}
              placeholder="Badung, Denpasar…"
              className="text-[12px] px-2 py-1.5 border border-[var(--brand-border)] rounded"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadExisting} className="ml-auto">
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => onScrapeMore?.()}
            className="bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]"
          >
            <Search className="w-3 h-3 mr-1" /> Scrape More
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-premium">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[var(--brand-ink)]/60">
              No competitor stores found. Click <strong>Scrape More</strong> to fetch from OpenStreetMap via the unified Data Scraper.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-[11.5px]">
                <thead className="bg-[var(--brand-cream)] sticky top-0">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/70">
                    <th className="p-2">Brand</th>
                    <th className="p-2">Outlet</th>
                    <th className="p-2">Kabupaten</th>
                    <th className="p-2">City</th>
                    <th className="p-2">Mall</th>
                    <th className="p-2">Coords</th>
                    <th className="p-2">Source</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 500).map(c => (
                    <tr key={c.id} className="border-t border-[var(--brand-border)] hover:bg-[var(--brand-cream)]/50">
                      <td className="p-2 font-medium">{c.brand_name}</td>
                      <td className="p-2">{c.name}</td>
                      <td className="p-2">{c.kab}</td>
                      <td className="p-2">{c.city}</td>
                      <td className="p-2">{c.is_in_mall ? c.mall_name : '—'}</td>
                      <td className="p-2 font-mono text-[10px] text-[var(--brand-ink)]/60">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</td>
                      <td className="p-2 text-[10px] text-[var(--brand-ink)]/60 truncate max-w-[120px]">{c.source}</td>
                      <td className="p-2">
                        <button
                          onClick={() => deleteRow(c.id)}
                          className="text-[var(--brand-ink)]/40 hover:text-[var(--brand-red)]"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
