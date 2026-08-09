'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  Search, Filter, Shield, MapPin, RefreshCw, Trash2, Edit, Save, X, ArrowRight,
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
  source_url: string | null
  last_crawled_at: string | null
}

interface Props {
  /** Optional callback when user clicks "Scrape More" — navigates to the unified scraper */
  onScrapeMore?: () => void
}

const CATEGORY_OPTIONS = [
  'convenience_store', 'fast_food', 'coffee', 'fashion', 'beauty',
  'supermarket', 'pharmacy', 'department_store', 'sports', 'other',
]

const CATEGORY_LABELS: Record<string, string> = {
  convenience_store: 'Convenience Store',
  fast_food: 'Fast Food',
  coffee: 'Coffee',
  fashion: 'Fashion',
  beauty: 'Beauty',
  supermarket: 'Supermarket',
  pharmacy: 'Pharmacy',
  department_store: 'Department Store',
  sports: 'Sports',
  other: 'Other',
}

export function CompetitorIntel({ onScrapeMore }: Props) {
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ brand: '', kab: '', kec: '', category: '' })
  const [editing, setEditing] = useState<CompetitorRow | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadExisting()
  }, [])

  async function loadExisting() {
    setLoading(true)
    try {
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

  function openEdit(row: CompetitorRow) {
    setEditing({ ...row })
    setShowEditDialog(true)
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    try {
      // Strip fields we don't want to overwrite
      const { id, last_crawled_at, created_at, updated_at, ...updateFields } = editing as any
      const res = await fetch(`/api/locinsight/competitors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateFields),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Competitor updated')
        setCompetitors(prev => prev.map(c => c.id === id ? { ...c, ...json.data } : c))
        setShowEditDialog(false)
        setEditing(null)
      } else {
        toast.error(json.error || 'Update failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = competitors.filter(c => {
    if (filter.brand && c.brand_name !== filter.brand) return false
    if (filter.category && c.brand_category !== filter.category) return false
    if (filter.kab && !c.kab.toLowerCase().includes(filter.kab.toLowerCase())) return false
    if (filter.kec && !c.kec.toLowerCase().includes(filter.kec.toLowerCase())) return false
    return true
  })

  const brandsInDb = Array.from(new Set(competitors.map(c => c.brand_name)))
  const categoriesInDb = Array.from(new Set(competitors.map(c => c.brand_category)))
  const kecamatanInDb = Array.from(new Set(competitors.map(c => c.kec).filter(Boolean)))
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
          View, edit, and analyze competitor store presence (Indomaret, Alfamart, McDonald's, etc.) scraped from OpenStreetMap.
          Each competitor is enriched with kecamatan & kabupaten info via reverse-geocoding. For bulk operations, use the{' '}
          <strong>Data Manager → Competitors</strong> tab.
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
            <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60">Kecamatan Covered</div>
            <div className="font-display text-[28px] font-bold text-[var(--brand-ink)]">{kecamatanInDb.length}</div>
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
            <label className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60 block mb-1">Category</label>
            <select
              value={filter.category}
              onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
              className="text-[12px] px-2 py-1.5 border border-[var(--brand-border)] rounded"
            >
              <option value="">All categories</option>
              {categoriesInDb.sort().map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
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
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60 block mb-1">Kecamatan</label>
            <input
              type="text"
              value={filter.kec}
              onChange={e => setFilter(f => ({ ...f, kec: e.target.value }))}
              placeholder="Kuta, Denpasar Barat…"
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
                    <th className="p-2">Category</th>
                    <th className="p-2">Outlet Name</th>
                    <th className="p-2">Kecamatan</th>
                    <th className="p-2">Kabupaten</th>
                    <th className="p-2">In Mall</th>
                    <th className="p-2">Mall Name</th>
                    <th className="p-2">Source</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 500).map(c => (
                    <tr key={c.id} className="border-t border-[var(--brand-border)] hover:bg-[var(--brand-cream)]/50">
                      <td className="p-2 font-medium text-[var(--brand-red)]">{c.brand_name}</td>
                      <td className="p-2"><Badge variant="outline" className="text-[9px]">{CATEGORY_LABELS[c.brand_category] || c.brand_category}</Badge></td>
                      <td className="p-2 max-w-[200px] truncate" title={c.name}>{c.name}</td>
                      <td className="p-2">{c.kec || '—'}</td>
                      <td className="p-2">{c.kab || '—'}</td>
                      <td className="p-2">{c.is_in_mall ? <Badge className="text-[9px] bg-[var(--brand-ink)]">Yes</Badge> : '—'}</td>
                      <td className="p-2 max-w-[120px] truncate" title={c.mall_name || ''}>{c.is_in_mall ? (c.mall_name || '—') : '—'}</td>
                      <td className="p-2 text-[10px] text-[var(--brand-ink)]/60">{c.source}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-[var(--brand-ink)]/40 hover:text-[var(--brand-ink)] p-1 rounded hover:bg-[var(--brand-cream)]"
                            title="Edit"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteRow(c.id)}
                            className="text-[var(--brand-ink)]/40 hover:text-[var(--brand-red)] p-1 rounded hover:bg-[var(--brand-cream)]"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-4 h-4 text-[var(--brand-red)]" />
              Edit Competitor Store
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
              {/* Brand info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Brand Name *</Label>
                  <Input
                    value={editing.brand_name}
                    onChange={(e) => setEditing({ ...editing, brand_name: e.target.value })}
                    className="h-9 text-[12px]"
                  />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Category</Label>
                  <Select
                    value={editing.brand_category}
                    onValueChange={(v) => setEditing({ ...editing, brand_category: v })}
                  >
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Outlet Name *</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="h-9 text-[12px]"
                />
              </div>

              {/* Admin boundary info — the key fix */}
              <div className="bg-[var(--brand-cream)] p-3 rounded border border-[var(--brand-border)]">
                <Label className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/50 mb-2 block">Location (Admin Boundary)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-[var(--brand-ink)]/60 mb-1 block">Kecamatan</Label>
                    <Input
                      value={editing.kec || ''}
                      onChange={(e) => setEditing({ ...editing, kec: e.target.value })}
                      className="h-9 text-[12px]"
                      placeholder="e.g. Kuta Utara"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-[var(--brand-ink)]/60 mb-1 block">Kabupaten/Kota</Label>
                    <Input
                      value={editing.kab || ''}
                      onChange={(e) => setEditing({ ...editing, kab: e.target.value })}
                      className="h-9 text-[12px]"
                      placeholder="e.g. Badung"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-[var(--brand-ink)]/60 mb-1 block">City</Label>
                    <Input
                      value={editing.city || ''}
                      onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                      className="h-9 text-[12px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-[var(--brand-ink)]/60 mb-1 block">Address</Label>
                    <Input
                      value={editing.address || ''}
                      onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                      className="h-9 text-[12px]"
                      placeholder="Street address (if known)"
                    />
                  </div>
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Latitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={editing.lat}
                    onChange={(e) => setEditing({ ...editing, lat: parseFloat(e.target.value) })}
                    className="h-9 text-[12px]"
                  />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Longitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={editing.lng}
                    onChange={(e) => setEditing({ ...editing, lng: parseFloat(e.target.value) })}
                    className="h-9 text-[12px]"
                  />
                </div>
              </div>

              {/* Mall info */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!editing.is_in_mall}
                    onCheckedChange={(v) => setEditing({ ...editing, is_in_mall: v })}
                  />
                  <Label className="text-[12px]">Located inside a mall?</Label>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Mall Name</Label>
                  <Input
                    value={editing.mall_name || ''}
                    onChange={(e) => setEditing({ ...editing, mall_name: e.target.value })}
                    className="h-9 text-[12px]"
                    disabled={!editing.is_in_mall}
                  />
                </div>
              </div>

              {/* Source info */}
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Source URL</Label>
                <Input
                  value={editing.source_url || ''}
                  onChange={(e) => setEditing({ ...editing, source_url: e.target.value })}
                  className="h-9 text-[12px]"
                  placeholder="https://www.openstreetmap.org/..."
                />
              </div>

              <div className="text-[10px] text-[var(--brand-ink)]/50">
                Last crawled: {editing.last_crawled_at ? new Date(editing.last_crawled_at).toLocaleString() : '—'} · Source: {editing.source}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setEditing(null) }}>
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
