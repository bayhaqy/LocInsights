'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Search, Filter, Shield, Building2, MapPin, Loader2, AlertCircle,
  CheckCircle2, XCircle, Download, Trash2, RefreshCw,
} from 'lucide-react'
import { COMPETITOR_BRANDS } from '@/lib/data/competitor-brands'

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

interface ScrapedResult {
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
  on_land: boolean
  source: string
}

export function CompetitorIntel() {
  const [tab, setTab] = useState<'existing' | 'scraper'>('existing')
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ brand: '', kab: '' })

  // Scraper state
  const [scraping, setScraping] = useState(false)
  const [scrapeResults, setScrapeResults] = useState<ScrapedResult[] | null>(null)
  const [scrapeMeta, setScrapeMeta] = useState<{ source: string; totalFound: number } | null>(null)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadExisting()
  }, [])

  async function loadExisting() {
    setLoading(true)
    try {
      const res = await fetch('/api/locinsight/scrape-competitors')
      const json = await res.json()
      if (json.success) setCompetitors(json.data)
      else toast.error(json.error || 'Failed to load')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function runScrape() {
    setScraping(true)
    setScrapeResults(null)
    setSelectedRows(new Set())
    try {
      const brands = selectedBrands.length > 0 ? selectedBrands : undefined
      const res = await fetch('/api/locinsight/scrape-competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brands }),
      })
      const json = await res.json()
      if (json.success) {
        setScrapeResults(json.results)
        setScrapeMeta({ source: json.source, totalFound: json.total_found })
        // Auto-select on-land rows
        const onLandIndices = new Set<number>()
        json.results.forEach((r: ScrapedResult, i: number) => {
          if (r.on_land) onLandIndices.add(i)
        })
        setSelectedRows(onLandIndices)
        toast.success(`Found ${json.total_found} competitors`)
      } else {
        toast.error(json.error || 'Scrape failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setScraping(false)
    }
  }

  async function saveSelected() {
    if (!scrapeResults) return
    setSaving(true)
    try {
      const items = scrapeResults
        .map((r, i) => ({ ...r, idx: i }))
        .filter(r => selectedRows.has(r.idx))
        .map(({ idx, on_land, ...rest }) => rest)
      const res = await fetch('/api/locinsight/scrape-competitors-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Saved ${json.created} new, updated ${json.updated}`)
        await loadExisting()
        setScrapeResults(null)
        setScrapeMeta(null)
        setSelectedRows(new Set())
      } else {
        toast.error(json.error || 'Save failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  function toggleRow(idx: number) {
    const next = new Set(selectedRows)
    if (next.has(idx)) next.delete(idx)
    else next.add(idx)
    setSelectedRows(next)
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
          Scrape & analyze competitor store presence (Indomaret, Alfamart, McDonald's, etc.) across Bali
        </p>
      </div>

      <div className="flex gap-2 border-b border-[var(--brand-border)]">
        <button
          onClick={() => setTab('existing')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === 'existing' ? 'border-[var(--brand-red)] text-[var(--brand-red)]' : 'border-transparent text-[var(--brand-ink)]/60'}`}
        >
          Existing Data ({competitors.length})
        </button>
        <button
          onClick={() => setTab('scraper')}
          className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px ${tab === 'scraper' ? 'border-[var(--brand-red)] text-[var(--brand-red)]' : 'border-transparent text-[var(--brand-ink)]/60'}`}
        >
          Scraper (Review → Save)
        </button>
      </div>

      {tab === 'existing' && (
        <>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {byBrand.slice(0, 12).map(b => (
                  <div key={b.brand} className="bg-[var(--brand-cream)] p-2 rounded">
                    <div className="text-[11px] font-medium text-[var(--brand-ink)] truncate">{b.brand}</div>
                    <div className="text-[18px] font-bold text-[var(--brand-red)] num-tabular">{b.count}</div>
                  </div>
                ))}
              </div>
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
              <Button variant="outline" size="sm" onClick={() => setTab('scraper')}>
                <Search className="w-3 h-3 mr-1" /> Scrape More
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
                  No competitor stores found. Use the Scraper tab to fetch from OpenStreetMap.
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'scraper' && (
        <>
          {/* Brand selector */}
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--brand-red)]" /> Brands to Scrape
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="text-[11.5px] text-[var(--brand-ink)]/70">
                Select specific brands or leave empty to scrape all {COMPETITOR_BRANDS.length} predefined brands. Uses OSM Overpass API.
                Results returned for your review before saving.
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {COMPETITOR_BRANDS.map(b => (
                  <label key={b.name} className="flex items-center gap-2 text-[12px] cursor-pointer p-1.5 rounded hover:bg-[var(--brand-cream)]">
                    <Checkbox
                      checked={selectedBrands.includes(b.name)}
                      onCheckedChange={(v) => {
                        if (v) setSelectedBrands(s => [...s, b.name])
                        else setSelectedBrands(s => s.filter(x => x !== b.name))
                      }}
                    />
                    <span>{b.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={runScrape} disabled={scraping}>
                  {scraping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  {scraping ? 'Scraping (may take 30-60s)…' : `Scrape ${selectedBrands.length || COMPETITOR_BRANDS.length} Brands`}
                </Button>
                {selectedBrands.length > 0 && (
                  <Button variant="outline" onClick={() => setSelectedBrands([])}>Clear</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {scrapeResults && (
            <Card className="card-premium">
              <CardHeader className="pb-2">
                <CardTitle className="text-[12px] uppercase tracking-wider flex items-center justify-between">
                  <span>Scrape Results — Review & Save</span>
                  <Badge variant="outline">{scrapeMeta?.totalFound} found</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-[11px] text-[var(--brand-ink)]/60">
                    Selected: <strong className="text-[var(--brand-ink)]">{selectedRows.size}</strong> of {scrapeResults.length}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const onLand = new Set<number>()
                      scrapeResults.forEach((r, i) => { if (r.on_land) onLand.add(i) })
                      setSelectedRows(onLand)
                    }}
                  >
                    All On-Land
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRows(new Set(scrapeResults.map((_, i) => i)))}
                  >
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedRows(new Set())}>
                    Clear
                  </Button>
                  <Button
                    onClick={saveSelected}
                    disabled={selectedRows.size === 0 || saving}
                    className="ml-auto"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Save Selected ({selectedRows.size})
                  </Button>
                </div>

                <div className="max-h-[500px] overflow-y-auto border border-[var(--brand-border)] rounded">
                  <table className="w-full text-[11.5px]">
                    <thead className="bg-[var(--brand-cream)] sticky top-0">
                      <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--brand-ink)]/70">
                        <th className="p-2"></th>
                        <th className="p-2">Brand</th>
                        <th className="p-2">Outlet</th>
                        <th className="p-2">Category</th>
                        <th className="p-2">Coords</th>
                        <th className="p-2">On Land</th>
                        <th className="p-2">Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scrapeResults.map((r, i) => (
                        <tr
                          key={i}
                          className={`border-t border-[var(--brand-border)] ${selectedRows.has(i) ? 'bg-[var(--brand-red-light)]/40' : ''} ${!r.on_land ? 'bg-amber-50' : ''}`}
                        >
                          <td className="p-2">
                            <Checkbox
                              checked={selectedRows.has(i)}
                              onCheckedChange={() => toggleRow(i)}
                              disabled={!r.on_land}
                            />
                          </td>
                          <td className="p-2 font-medium">{r.brand_name}</td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2 text-[10px] text-[var(--brand-ink)]/60">{r.brand_category}</td>
                          <td className="p-2 font-mono text-[10px]">{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</td>
                          <td className="p-2">
                            {r.on_land
                              ? <CheckCircle2 className="w-3 h-3 text-green-600" />
                              : <XCircle className="w-3 h-3 text-amber-600" />}
                          </td>
                          <td className="p-2 text-[10px] text-[var(--brand-ink)]/60 truncate max-w-[200px]">{r.address || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
