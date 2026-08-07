'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Search, MapPin, Database, Loader2, CheckCircle2, XCircle, Clock, ExternalLink,
  Save, Filter, AlertTriangle, CheckSquare, Square,
} from 'lucide-react'
import { toast } from 'sonner'

interface ScraperResult {
  name: string
  type: string
  lat: number
  lng: number
  category: string
  kind: 'store' | 'mall' | 'poi'
  tags: Record<string, string>
  on_land: boolean
  address?: string
  brand_name?: string
  brand_category?: string
  poi_type?: string
  poi_magnitude?: number
  poi_notes?: string
  source: string
}

interface ScraperRun {
  id: string
  query: string
  source: string
  status: string
  found_count: number
  saved_count: number
  startedAt: string
  finishedAt: string | null
}

interface Geocoded {
  lat: number
  lng: number
  display_name: string
  is_in_bali: boolean
  address?: any
}

export function Scraper() {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'store' | 'mall' | 'poi' | 'all'>('all')
  const [radius, setRadius] = useState('5')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<ScraperResult[]>([])
  const [geo, setGeo] = useState<Geocoded | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [totalFound, setTotalFound] = useState(0)
  const [history, setHistory] = useState<ScraperRun[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [filterKind, setFilterKind] = useState<'all' | 'store' | 'mall' | 'poi' | 'on_land' | 'off_land'>('all')

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    try {
      const res = await fetch('/api/locinsight/scrape?limit=20')
      const json = await res.json()
      if (json.success) setHistory(json.data)
    } catch {}
  }

  async function scrape() {
    if (!query.trim()) {
      toast.error('Enter a search query first')
      return
    }
    setLoading(true)
    setResults([])
    setGeo(null)
    setRunId(null)
    setSelected(new Set())
    try {
      const res = await fetch('/api/locinsight/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, kind, radius_km: Number(radius) }),
      })
      const json = await res.json()
      if (json.success) {
        setGeo(json.geocoded)
        setResults(json.results || [])
        setRunId(json.run_id)
        setTotalFound(json.total_found)
        // Auto-select all on-land results by default for convenience
        const defaultSelected = new Set<number>()
        ;(json.results || []).forEach((r: ScraperResult, i: number) => {
          if (r.on_land) defaultSelected.add(i)
        })
        setSelected(defaultSelected)
        toast.success(`Found ${json.total_found} items — review and select which to save`)
        fetchHistory()
      } else {
        toast.error(json.error || 'Scrape failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleSelected(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function selectAllVisible() {
    const visible = filteredResults.map((_, idx) => idx) // careful — filteredResults reindexes
    // We need original indices, so map original indices
    const indices: number[] = []
    for (let i = 0; i < results.length; i++) {
      if (matchesFilter(results[i])) indices.push(i)
    }
    setSelected(new Set(indices))
  }

  function selectAllOnLand() {
    const indices = new Set<number>()
    results.forEach((r, i) => { if (r.on_land) indices.add(i) })
    setSelected(indices)
  }

  function clearSelection() {
    setSelected(new Set())
  }

  function matchesFilter(r: ScraperResult): boolean {
    if (filterKind === 'all') return true
    if (filterKind === 'on_land') return r.on_land
    if (filterKind === 'off_land') return !r.on_land
    return r.kind === filterKind
  }

  const filteredResults = useMemo(() => {
    return results
      .map((r, originalIndex) => ({ r, originalIndex }))
      .filter(({ r }) => matchesFilter(r))
  }, [results, filterKind])

  async function saveSelected() {
    if (selected.size === 0) {
      toast.warning('No items selected')
      return
    }
    if (!geo) {
      toast.error('No geocoded context — please re-run the scrape')
      return
    }
    setSaving(true)
    try {
      const items = Array.from(selected).map(i => results[i])
      const res = await fetch('/api/locinsight/scrape-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_id: runId || undefined,
          query,
          geocoded: geo,
          items,
        }),
      })
      const json = await res.json()
      if (json.success) {
        const s = json.saved
        toast.success(`Saved ${s.total} records (${s.stores} stores, ${s.malls} malls, ${s.pois} POIs)${json.skipped ? ` · ${json.skipped} duplicates skipped` : ''}${json.error_count ? ` · ${json.error_count} errors` : ''}`)
        if (json.error_count > 0) {
          console.warn('Save errors:', json.errors)
        }
        // Mark saved items in the UI
        setResults(prev => prev.map((r, i) => selected.has(i) ? { ...r, /* could mark saved */ } : r))
        setSelected(new Set())
        fetchHistory()
      } else {
        toast.error(json.error)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const exampleQueries = [
    'Starbucks Kuta',
    'Mall Denpasar',
    'Canggu cafe',
    'Ubud restaurant',
    'Nusa Dua hotel',
    'Seminyak boutique',
    'Sanur Beach',
    'Jimbaran seafood',
  ]

  const counts = useMemo(() => {
    let onLand = 0, offLand = 0, stores = 0, malls = 0, pois = 0
    for (const r of results) {
      if (r.on_land) onLand++; else offLand++
      if (r.kind === 'store') stores++
      else if (r.kind === 'mall') malls++
      else pois++
    }
    return { onLand, offLand, stores, malls, pois, total: results.length }
  }, [results])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          Data Scraper
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          Auto-discover stores, malls, and POIs from OpenStreetMap. <strong>Review results first</strong>, then select which ones to save — nothing is auto-saved.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Left: Search + Results */}
        <div className="space-y-3">
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                Search & Scrape
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Query (store name, brand, or area)</Label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && scrape()}
                  placeholder="e.g., Starbucks Kuta, Mall Denpasar, Canggu cafe"
                  className="h-10 text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Type</Label>
                  <Select value={kind} onValueChange={(v) => setKind(v as any)}>
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="store">Stores only</SelectItem>
                      <SelectItem value="mall">Malls only</SelectItem>
                      <SelectItem value="poi">POIs only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Radius (km)</Label>
                  <Input
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    min="1"
                    max="20"
                    className="h-9 text-[12px]"
                  />
                </div>
              </div>

              <Button
                onClick={scrape}
                disabled={loading || !query.trim()}
                className="w-full bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scraping OSM…
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Scrape Now (review only — no auto-save)
                  </>
                )}
              </Button>

              {/* Example queries */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {exampleQueries.map(q => (
                  <button
                    key={q}
                    onClick={() => setQuery(q)}
                    className="text-[10.5px] px-2 py-1 rounded border border-[var(--brand-border)] bg-white hover:bg-[var(--brand-cream)] text-[var(--brand-ink)]/70"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {(geo || results.length > 0) && (
            <Card className="card-premium">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                    Results for Review
                  </CardTitle>
                  <div className="text-[11px] text-[var(--brand-ink)]/60 flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] h-4">{counts.total} found</Badge>
                    <Badge variant="outline" className="text-[9px] h-4 text-green-700 border-green-300">{counts.onLand} on land</Badge>
                    {counts.offLand > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 text-amber-700 border-amber-300">{counts.offLand} sea</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {geo && (
                  <div className="p-3 rounded-md bg-[var(--brand-cream)] border border-[var(--brand-border)] text-[12px]">
                    <div className="font-semibold">{geo.display_name}</div>
                    <div className="text-[11px] text-[var(--brand-ink)]/60 mt-0.5 flex items-center gap-2 flex-wrap">
                      <Badge variant={geo.is_in_bali ? 'default' : 'secondary'} className="text-[9px] h-4">
                        {geo.is_in_bali ? 'In Bali' : 'Outside Bali'}
                      </Badge>
                      <span className="font-mono">{geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}</span>
                    </div>
                  </div>
                )}

                {/* Selection toolbar */}
                {results.length > 0 && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-md border border-[var(--brand-border)] bg-white">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-[var(--brand-ink)]/60">
                        <strong className="text-[var(--brand-red)]">{selected.size}</strong> selected
                      </span>
                      <Button size="sm" variant="ghost" onClick={selectAllOnLand} className="h-6 text-[10px] px-2">
                        <CheckSquare className="w-3 h-3 mr-1" /> All on-land
                      </Button>
                      <Button size="sm" variant="ghost" onClick={selectAllVisible} className="h-6 text-[10px] px-2">
                        <CheckSquare className="w-3 h-3 mr-1" /> All visible
                      </Button>
                      <Button size="sm" variant="ghost" onClick={clearSelection} className="h-6 text-[10px] px-2">
                        <Square className="w-3 h-3 mr-1" /> Clear
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={saveSelected}
                      disabled={saving || selected.size === 0}
                      className="h-7 text-[11px] bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]"
                    >
                      {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                      Save Selected ({selected.size})
                    </Button>
                  </div>
                )}

                {/* Filter pills */}
                {results.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Filter className="w-3 h-3 text-[var(--brand-ink)]/40" />
                    {(['all','store','mall','poi','on_land','off_land'] as const).map(f => {
                      const labels: Record<string, string> = {
                        all: `All (${counts.total})`,
                        store: `Stores (${counts.stores})`,
                        mall: `Malls (${counts.malls})`,
                        poi: `POIs (${counts.pois})`,
                        on_land: `On land (${counts.onLand})`,
                        off_land: `Sea (${counts.offLand})`,
                      }
                      const isOff = f === 'off_land' && counts.offLand === 0
                      return (
                        <button
                          key={f}
                          onClick={() => setFilterKind(f)}
                          disabled={isOff}
                          className={`text-[10.5px] px-2 py-0.5 rounded border ${
                            filterKind === f
                              ? 'bg-[var(--brand-red)] text-white border-[var(--brand-red)]'
                              : 'bg-white text-[var(--brand-ink)]/70 border-[var(--brand-border)] hover:bg-[var(--brand-cream)]'
                          } ${isOff ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          {labels[f]}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Result rows */}
                <div className="max-h-[600px] overflow-y-auto space-y-1.5">
                  {filteredResults.map(({ r, originalIndex }) => {
                    const isSelected = selected.has(originalIndex)
                    return (
                      <div
                        key={originalIndex}
                        className={`flex items-start gap-2 p-2 rounded border ${
                          isSelected
                            ? 'border-[var(--brand-red)] bg-[var(--brand-red)]/5'
                            : r.on_land
                              ? 'border-[var(--brand-border)] bg-white'
                              : 'border-amber-200 bg-amber-50/50'
                        }`}
                      >
                        <button
                          onClick={() => toggleSelected(originalIndex)}
                          disabled={!r.on_land}
                          className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${
                            !r.on_land
                              ? 'border-amber-300 bg-amber-100 cursor-not-allowed'
                              : isSelected
                                ? 'bg-[var(--brand-red)] border-[var(--brand-red)]'
                                : 'border-[var(--brand-border)] bg-white hover:border-[var(--brand-red)]'
                          }`}
                          title={r.on_land ? (isSelected ? 'Selected' : 'Click to select') : 'Cannot save — location in sea'}
                        >
                          {isSelected && r.on_land && <CheckCircle2 className="w-3 h-3 text-white" />}
                          {!r.on_land && <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium truncate">{r.name}</div>
                          <div className="text-[10.5px] text-[var(--brand-ink)]/60">{r.category}</div>
                          <div className="text-[10px] text-[var(--brand-ink)]/40 mt-0.5 font-mono">
                            {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                            {!r.on_land && <span className="text-amber-700 ml-1">· in sea — cannot save</span>}
                            {r.address && <span className="ml-1">· {r.address.slice(0, 50)}</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] h-4 capitalize">{r.kind}</Badge>
                      </div>
                    )
                  })}
                  {results.length > 0 && filteredResults.length === 0 && (
                    <div className="text-[12px] text-[var(--brand-ink)]/40 py-6 text-center">No results match this filter</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: History + info */}
        <div className="space-y-3">
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[var(--brand-ink)]" />
                Scrape History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-[12px] text-[var(--brand-ink)]/40 py-6 text-center">No scrapes yet</div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {history.map(h => (
                    <div key={h.id} className="p-2 rounded border border-[var(--brand-border)] bg-white text-[11.5px]">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-medium truncate flex-1">{h.query}</span>
                        <Badge variant={h.status === 'success' ? 'default' : 'secondary'} className="text-[9px] h-4 ml-1">
                          {h.status}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-[var(--brand-ink)]/50">
                        {new Date(h.startedAt).toLocaleString()} · Found {h.found_count} · Saved {h.saved_count}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-premium bg-[var(--brand-cream)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11.5px] text-[var(--brand-ink)]/70 space-y-2">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--brand-red)] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                <div>Scrape OSM (Nominatim + Overpass) — returns matching shops/malls/POIs as a list, with land validation per item.</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--brand-red)] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                <div>Review the results. Items marked <span className="text-amber-700 font-medium">"in sea"</span> cannot be saved — they need coordinate fixing or skipping.</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--brand-red)] text-white text-[10px] font-bold flex items-center justify-center">3</span>
                <div>Select rows via checkbox (all on-land items are pre-selected). Filter by type or land status to narrow down.</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--brand-red)] text-white text-[10px] font-bold flex items-center justify-center">4</span>
                <div>Click <strong>Save Selected</strong> — only your chosen items get persisted to master data (with deduplication).</div>
              </div>
              <div className="pt-2 mt-2 border-t border-[var(--brand-border)] text-[10px] text-[var(--brand-ink)]/50">
                Rate-limited to 1 req/sec per Nominatim usage policy (Aug 2026). All data is open (ODbL license). Source attribution preserved in the <code>source</code> field of each saved record.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
