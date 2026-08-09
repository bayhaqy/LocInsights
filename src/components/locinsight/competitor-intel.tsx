'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  Search, Shield, RefreshCw, Trash2, Edit, Save, X, ArrowRight,
  ArrowUp, ArrowDown, ArrowUpDown, Download, Filter as FilterIcon,
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

// =====================================================
// Column definitions — drives header rendering, sort,
// per-column filter, and CSV export.
// =====================================================
type SortDir = 'asc' | 'desc' | null

interface ColumnDef {
  key: keyof CompetitorRow
  label: string
  sortable?: boolean
  filterable?: boolean
  filterType?: 'text' | 'select'
  width?: string
  format?: (v: any, row: CompetitorRow) => React.ReactNode
  csvFormat?: (v: any, row: CompetitorRow) => string
}

const COLUMNS: ColumnDef[] = [
  { key: 'brand_name', label: 'Brand', sortable: true, filterable: true, filterType: 'select',
    format: (v) => <span className="font-medium text-[var(--brand-red)]">{v}</span> },
  { key: 'brand_category', label: 'Category', sortable: true, filterable: true, filterType: 'select',
    format: (v) => <Badge variant="outline" className="text-[9px]">{CATEGORY_LABELS[v as string] || v}</Badge> },
  { key: 'name', label: 'Outlet Name', sortable: true, filterable: true, filterType: 'text',
    format: (v) => <span className="block max-w-[200px] truncate" title={String(v)}>{v}</span> },
  { key: 'kec', label: 'Kecamatan', sortable: true, filterable: true, filterType: 'select',
    format: (v) => v || '—' },
  { key: 'kab', label: 'Kabupaten', sortable: true, filterable: true, filterType: 'select',
    format: (v) => v || '—' },
  { key: 'is_in_mall', label: 'In Mall', sortable: true, filterable: true, filterType: 'select',
    format: (v) => v ? <Badge className="text-[9px] bg-[var(--brand-ink)]">Yes</Badge> : '—',
    csvFormat: (v) => v ? 'Yes' : 'No' },
  { key: 'mall_name', label: 'Mall Name', sortable: true, filterable: true, filterType: 'text',
    format: (v, row) => row.is_in_mall ? <span className="block max-w-[120px] truncate" title={String(v || '')}>{v || '—'}</span> : '—' },
  { key: 'source', label: 'Source', sortable: true, filterable: true, filterType: 'select',
    format: (v) => <span className="text-[10px] text-[var(--brand-ink)]/60">{v}</span> },
]

export function CompetitorIntel({ onScrapeMore }: Props) {
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<CompetitorRow | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sort & per-column filter state
  const [sortCol, setSortCol] = useState<keyof CompetitorRow | null>('brand_name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  // Global text search (matches any field)
  const [globalSearch, setGlobalSearch] = useState('')
  // Per-column filters: { brand_name: 'Alfamart', kec: 'Kuta', ... }
  const [colFilters, setColFilters] = useState<Partial<Record<keyof CompetitorRow, string>>>({})

  useEffect(() => {
    loadExisting()
  }, [])

  const loadExisting = useCallback(async () => {
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
  }, [])

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

  // Toggle sort column
  function toggleSort(colKey: keyof CompetitorRow) {
    if (sortCol !== colKey) {
      setSortCol(colKey)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else if (sortDir === 'desc') {
      setSortCol(null)
      setSortDir(null)
    } else {
      setSortCol(colKey)
      setSortDir('asc')
    }
  }

  // Reset all filters & sort
  function resetFilters() {
    setGlobalSearch('')
    setColFilters({})
    setSortCol('brand_name')
    setSortDir('asc')
  }

  // === Apply global + per-column filters, then sort ===
  const filtered = useMemo(() => {
    let result = competitors

    // Global search
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase()
      result = result.filter(c =>
        `${c.brand_name} ${c.brand_category} ${c.name} ${c.kec} ${c.kab} ${c.city} ${c.address} ${c.mall_name || ''} ${c.source}`
          .toLowerCase().includes(q)
      )
    }

    // Per-column filters
    for (const [k, v] of Object.entries(colFilters)) {
      if (!v) continue
      const key = k as keyof CompetitorRow
      result = result.filter(c => {
        const cellVal = c[key]
        if (cellVal == null) return false
        if (typeof cellVal === 'boolean') return String(cellVal) === v
        return String(cellVal).toLowerCase().includes((v as string).toLowerCase())
      })
    }

    // Sort
    if (sortCol && sortDir) {
      const col = sortCol
      const dir = sortDir === 'asc' ? 1 : -1
      result = [...result].sort((a, b) => {
        const va = a[col]
        const vb = b[col]
        if (va == null && vb == null) return 0
        if (va == null) return 1
        if (vb == null) return -1
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
        return String(va).localeCompare(String(vb)) * dir
      })
    }

    return result
  }, [competitors, globalSearch, colFilters, sortCol, sortDir])

  // === Get unique values for select-based column filters ===
  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {}
    for (const col of COLUMNS) {
      if (col.filterType === 'select') {
        const set = new Set<string>()
        for (const r of competitors) {
          const v = r[col.key]
          if (v != null && v !== '') set.add(typeof v === 'boolean' ? String(v) : String(v))
        }
        opts[col.key as string] = Array.from(set).sort()
      }
    }
    return opts
  }, [competitors])

  const brandsInDb = filterOptions['brand_name'] || []
  const categoriesInDb = filterOptions['brand_category'] || []
  const kecamatanInDb = filterOptions['kec'] || []
  const kabupatenInDb = filterOptions['kab'] || []
  const sourcesInDb = filterOptions['source'] || []

  const byBrand = brandsInDb.map(b => ({
    brand: b,
    count: competitors.filter(c => c.brand_name === b).length,
  })).sort((a, b) => b.count - a.count)

  // === Filtered CSV export ===
  function exportFilteredCSV() {
    if (filtered.length === 0) {
      toast.info('No data to export')
      return
    }
    const headers = ['id', ...COLUMNS.map(c => c.key), 'address', 'city', 'lat', 'lng', 'source_url', 'last_crawled_at']
    const headerLabels = ['ID', ...COLUMNS.map(c => c.label), 'Address', 'City', 'Latitude', 'Longitude', 'Source URL', 'Last Crawled At']
    const lines = [headerLabels.join(',')]
    for (const r of filtered) {
      const cells = headers.map(h => {
        const v = (r as any)[h]
        if (v == null) return ''
        const s = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)
        // RFC 4180 quoting
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`
        }
        return s
      })
      lines.push(cells.join(','))
    }
    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `competitors_filtered_${filtered.length}rows_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} filtered rows to CSV`)
  }

  const isFilterActive = globalSearch !== '' || Object.values(colFilters).some(v => v) ||
    (sortCol !== 'brand_name' || sortDir !== 'asc')

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
            Competitor Intelligence
          </h2>
          <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
            View, edit, and analyze competitor store presence scraped from OpenStreetMap. Click any column header to sort;
            use the filter inputs below each header to narrow results; export respects current filters & sort.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={loadExisting} disabled={loading}>
            <RefreshCw className={`w-3 h-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => onScrapeMore?.()}
            className="bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]"
          >
            <Search className="w-3 h-3 mr-1.5" /> Scrape More
            <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
        </div>
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
            <div className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60">Showing (Filtered)</div>
            <div className="font-display text-[28px] font-bold text-[var(--brand-ink)]">{filtered.length}</div>
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
                <div key={b.brand} className="bg-[var(--brand-cream)] p-2 rounded cursor-pointer hover:bg-[var(--brand-cream)]/70"
                  onClick={() => setColFilters(prev => ({ ...prev, brand_name: b.brand }))}
                  title={`Click to filter by ${b.brand}`}
                >
                  <div className="text-[11px] font-medium text-[var(--brand-ink)] truncate">{b.brand}</div>
                  <div className="text-[18px] font-bold text-[var(--brand-red)] num-tabular">{b.count}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Global filter bar */}
      <Card className="card-premium">
        <CardContent className="p-3 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/60 block mb-1">
              Global Search (any field)
            </label>
            <Input
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Search across all columns…"
              className="text-[12px] h-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={resetFilters} disabled={!isFilterActive} className="h-8">
            <FilterIcon className="w-3 h-3 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={exportFilteredCSV} disabled={filtered.length === 0}
            className="bg-[var(--brand-ink)] hover:bg-[var(--brand-ink)]/90 text-white h-8">
            <Download className="w-3 h-3 mr-1.5" />
            Export Filtered ({filtered.length})
          </Button>
        </CardContent>
      </Card>

      {/* Table with sort + per-column filter */}
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
              No competitor stores match the current filters. Adjust filters or{' '}
              <strong>Scrape More</strong> to fetch new data.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
              <table className="w-full text-[11.5px]">
                <thead className="bg-[var(--brand-cream)] sticky top-0 z-10">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/70">
                    {COLUMNS.map(col => {
                      const isSorted = sortCol === col.key
                      const SortIcon = !isSorted ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
                      return (
                        <th key={col.key as string} className="p-2 select-none">
                          <button
                            onClick={() => col.sortable && toggleSort(col.key)}
                            className={`flex items-center gap-1 hover:text-[var(--brand-red)] ${col.sortable ? 'cursor-pointer' : ''}`}
                          >
                            {col.label}
                            {col.sortable && <SortIcon className={`w-3 h-3 ${isSorted ? 'text-[var(--brand-red)]' : 'text-[var(--brand-ink)]/40'}`} />}
                          </button>
                        </th>
                      )
                    })}
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                  {/* Per-column filter row */}
                  <tr className="border-t border-[var(--brand-border)] bg-white">
                    {COLUMNS.map(col => {
                      if (!col.filterable) return <th key={col.key as string} className="p-1" />
                      const value = colFilters[col.key] || ''
                      if (col.filterType === 'select') {
                        const opts = filterOptions[col.key as string] || []
                        return (
                          <th key={col.key as string} className="p-1">
                            <select
                              value={value}
                              onChange={e => setColFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                              className="text-[10px] px-1 py-0.5 border border-[var(--brand-border)] rounded w-full bg-white"
                            >
                              <option value="">All</option>
                              {opts.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </th>
                        )
                      }
                      return (
                        <th key={col.key as string} className="p-1">
                          <input
                            type="text"
                            value={value}
                            onChange={e => setColFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                            placeholder="Filter…"
                            className="text-[10px] px-1 py-0.5 border border-[var(--brand-border)] rounded w-full"
                          />
                        </th>
                      )
                    })}
                    <th className="p-1" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 500).map(c => (
                    <tr key={c.id} className="border-t border-[var(--brand-border)] hover:bg-[var(--brand-cream)]/50">
                      {COLUMNS.map(col => (
                        <td key={col.key as string} className="p-2">
                          {col.format ? col.format(c[col.key], c) : (c[col.key] ?? '—')}
                        </td>
                      ))}
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
              {filtered.length > 500 && (
                <div className="p-2 text-center text-[11px] text-[var(--brand-ink)]/60 bg-[var(--brand-cream)] border-t border-[var(--brand-border)]">
                  Showing first 500 of {filtered.length} filtered rows. Use Export to download all.
                </div>
              )}
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
