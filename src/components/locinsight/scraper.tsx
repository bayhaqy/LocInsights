'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Search, MapPin, Database, Loader2, CheckCircle2, XCircle, Clock, ExternalLink,
  Save, Filter, AlertTriangle, CheckSquare, Square, Shield, Store as StoreIcon, HelpCircle, Globe2,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { COMPETITOR_BRANDS } from '@/lib/data/competitor-brands'
import { BRANDS } from '@/lib/data/brands'
import { classifyScrapedBrand, type SaveTarget } from '@/lib/brand-classifier'

// ============================================================================
// Types
// ============================================================================

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

type Mode = 'keyword' | 'brand'
type KindFilter = 'all' | 'store' | 'mall' | 'poi' | 'on_land' | 'off_land'

interface LocationOption {
  code: string
  name: string
  type?: string
  kab_code?: string
  kec_code?: string
  kab_name?: string
  kec_name?: string
  lat?: number
  lng?: number
}

// ============================================================================
// Component
// ============================================================================

export function Scraper() {
  // Mode + query state
  const [mode, setMode] = useState<Mode>('keyword')
  const [query, setQuery] = useState('')
  const [kinds, setKinds] = useState<{ store: boolean; mall: boolean; poi: boolean }>({
    store: true, mall: true, poi: true,
  })
  const [radius, setRadius] = useState('5')

  // Brand sweep state
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])

  // Hierarchical location filter
  const [kabupatenList, setKabupatenList] = useState<LocationOption[]>([])
  const [kecamatanList, setKecamatanList] = useState<LocationOption[]>([])
  const [kelurahanList, setKelurahanList] = useState<LocationOption[]>([])
  const [selKab, setSelKab] = useState<string>('')
  const [selKec, setSelKec] = useState<string>('')
  const [selKel, setSelKel] = useState<string>('')

  // Results state
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<ScraperResult[]>([])
  const [geo, setGeo] = useState<Geocoded | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [scrapeMeta, setScrapeMeta] = useState<any>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [filterKind, setFilterKind] = useState<KindFilter>('all')
  const [history, setHistory] = useState<ScraperRun[]>([])

  // Load locations once on mount
  useEffect(() => {
    fetch('/api/locinsight/locations')
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setKabupatenList(j.data.kabupaten || [])
          // pre-load all kecamatan + all kelurahan for snappy UX (Bali is small)
          setKecamatanList(j.data.kecamatan || [])
          setKelurahanList(j.data.kelurahan || [])
        }
      })
      .catch(() => {})
    fetchHistory()
  }, [])

  async function fetchHistory() {
    try {
      const res = await fetch('/api/locinsight/scrape?limit=20')
      const json = await res.json()
      if (json.success) setHistory(json.data)
    } catch {}
  }

  // Reset downstream selectors when parent changes
  function onKabChange(code: string) {
    setSelKab(code)
    setSelKec('')
    setSelKel('')
  }
  function onKecChange(code: string) {
    setSelKec(code)
    setSelKel('')
  }

  // Build the location filter object for the API
  const locationFilter = useMemo(() => {
    if (selKel) return { kel_code: selKel }
    if (selKec) return { kec_code: selKec }
    if (selKab) return { kab_code: selKab }
    return undefined
  }, [selKab, selKec, selKel])

  const locationLabel = useMemo(() => {
    if (selKel) {
      const k = kelurahanList.find(x => x.code === selKel)
      return k ? `Kel. ${k.name}` : 'Kelurahan'
    }
    if (selKec) {
      const k = kecamatanList.find(x => x.code === selKec)
      return k ? `Kec. ${k.name}` : 'Kecamatan'
    }
    if (selKab) {
      const k = kabupatenList.find(x => x.code === selKab)
      return k ? `${k.type === 'Kota' ? 'Kota' : 'Kab.'} ${k.name}` : 'Kabupaten'
    }
    return 'Bali (all)'
  }, [selKab, selKec, selKel, kabupatenList, kecamatanList, kelurahanList])

  // Filtered kecamatan/kelurahan based on parent selection
  const filteredKecamatan = useMemo(() => {
    if (!selKab) return kecamatanList
    return kecamatanList.filter(k => k.kab_code === selKab)
  }, [kecamatanList, selKab])

  const filteredKelurahan = useMemo(() => {
    if (!selKec) return kelurahanList
    return kelurahanList.filter(k => k.kec_code === selKec)
  }, [kelurahanList, selKec])

  // ============================================================================
  // Scrape action
  // ============================================================================

  async function scrape() {
    if (mode === 'keyword' && !query.trim()) {
      toast.error('Enter a search query first')
      return
    }
    setLoading(true)
    setResults([])
    setGeo(null)
    setRunId(null)
    setScrapeMeta(null)
    setSelected(new Set())
    try {
      const body: any = {
        mode,
        location: locationFilter,
      }
      if (mode === 'keyword') {
        body.query = query
        body.radius_km = Number(radius)
        body.kinds = (['store', 'mall', 'poi'] as const).filter(k => kinds[k])
        if (body.kinds.length === 0) {
          toast.error('Select at least one type (store/mall/poi)')
          setLoading(false)
          return
        }
      } else {
        body.brands = selectedBrands.length > 0 ? selectedBrands : undefined
      }

      const res = await fetch('/api/locinsight/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        setGeo(json.geocoded)
        setResults(json.results || [])
        setRunId(json.run_id)
        setScrapeMeta(json.meta)
        const defaultSelected = new Set<number>()
        ;(json.results || []).forEach((r: ScraperResult, i: number) => {
          if (r.on_land) defaultSelected.add(i)
        })
        setSelected(defaultSelected)
        const foundN = json.total_found || (json.results || []).length
        toast.success(`Found ${foundN} items in ${json.meta?.location_label || locationLabel} — review and select which to save`)
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

  // ============================================================================
  // Selection helpers
  // ============================================================================

  function toggleSelected(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function selectAllVisible() {
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

  // ============================================================================
  // Save action
  // ============================================================================

  async function saveSelected() {
    if (selected.size === 0) {
      toast.warning('No items selected')
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
          items,
        }),
      })
      const json = await res.json()
      if (json.success) {
        const s = json.saved
        const parts: string[] = []
        if (s.stores) parts.push(`${s.stores} MAA/MAP stores`)
        if (s.competitors) parts.push(`${s.competitors} competitors`)
        if (s.malls) parts.push(`${s.malls} malls`)
        if (s.pois) parts.push(`${s.pois} POIs`)
        toast.success(
          `Saved ${s.total} records (${parts.join(', ') || 'none'})` +
          (json.skipped ? ` · ${json.skipped} duplicates skipped` : '') +
          (json.error_count ? ` · ${json.error_count} errors` : '')
        )
        if (json.error_count > 0) {
          console.warn('Save errors:', json.errors)
        }
        setSelected(new Set())
        fetchHistory()
      } else {
        toast.error(json.error || 'Save failed')
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ============================================================================
  // Classification preview (shows user where each item will be saved)
  // ============================================================================

  const classifications = useMemo(() => {
    const map = new Map<string, { target: SaveTarget; brand_name: string; reason: string }>()
    for (const r of results) {
      if (r.kind !== 'store') continue
      const key = r.brand_name || r.name
      if (!map.has(key)) {
        const c = classifyScrapedBrand(r.brand_name || r.name)
        map.set(key, { target: c.target, brand_name: c.brand_name, reason: c.reason })
      }
    }
    return map
  }, [results])

  function getClassification(r: ScraperResult) {
    if (r.kind !== 'store') return null
    return classifications.get(r.brand_name || r.name) || null
  }

  // ============================================================================
  // Counts
  // ============================================================================

  const counts = useMemo(() => {
    let onLand = 0, offLand = 0, stores = 0, malls = 0, pois = 0
    let maaStores = 0, competitors = 0, others = 0
    for (const r of results) {
      if (r.on_land) onLand++; else offLand++
      if (r.kind === 'store') {
        stores++
        const c = getClassification(r)
        if (c?.target === 'maa_store') maaStores++
        else if (c?.target === 'competitor') competitors++
        else others++
      }
      else if (r.kind === 'mall') malls++
      else pois++
    }
    return { onLand, offLand, stores, malls, pois, total: results.length, maaStores, competitors, others }
  }, [results, classifications])

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

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          Data Scraper
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          Discover stores, malls, and POIs from OpenStreetMap. Two modes: keyword search (specific name/area) or brand sweep (predefined competitor catalog). Hierarchical location filter scopes results to a kabupaten / kecamatan / kelurahan. Review results first, then save — nothing is auto-saved.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* ============================================================ */}
        {/* LEFT: Search + Results                                       */}
        {/* ============================================================ */}
        <div className="space-y-3">
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                Search & Scrape
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 rounded-md bg-[var(--brand-cream)] border border-[var(--brand-border)]">
                <button
                  onClick={() => setMode('keyword')}
                  className={`flex-1 px-3 py-1.5 text-[12px] font-medium rounded ${mode === 'keyword' ? 'bg-white shadow-sm text-[var(--brand-red)]' : 'text-[var(--brand-ink)]/60'}`}
                >
                  <Search className="w-3 h-3 inline mr-1.5" />
                  Keyword Search
                </button>
                <button
                  onClick={() => setMode('brand')}
                  className={`flex-1 px-3 py-1.5 text-[12px] font-medium rounded ${mode === 'brand' ? 'bg-white shadow-sm text-[var(--brand-red)]' : 'text-[var(--brand-ink)]/60'}`}
                >
                  <Shield className="w-3 h-3 inline mr-1.5" />
                  Brand Sweep ({COMPETITOR_BRANDS.length} brands)
                </button>
              </div>

              {/* Hierarchical location filter */}
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block flex items-center gap-1">
                  <Globe2 className="w-3 h-3" />
                  Location Scope: <span className="text-[var(--brand-red)] font-medium normal-case tracking-normal">{locationLabel}</span>
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <select
                    value={selKab}
                    onChange={(e) => onKabChange(e.target.value)}
                    className="text-[12px] px-2 py-1.5 border border-[var(--brand-border)] rounded bg-white"
                  >
                    <option value="">All Kabupaten</option>
                    {kabupatenList.map(k => (
                      <option key={k.code} value={k.code}>
                        {k.type === 'Kota' ? 'Kota ' : 'Kab. '}{k.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selKec}
                    onChange={(e) => onKecChange(e.target.value)}
                    disabled={!selKab}
                    className="text-[12px] px-2 py-1.5 border border-[var(--brand-border)] rounded bg-white disabled:opacity-50"
                  >
                    <option value="">All Kecamatan</option>
                    {filteredKecamatan.map(k => (
                      <option key={k.code} value={k.code}>{k.name}</option>
                    ))}
                  </select>
                  <select
                    value={selKel}
                    onChange={(e) => setSelKel(e.target.value)}
                    disabled={!selKec}
                    className="text-[12px] px-2 py-1.5 border border-[var(--brand-border)] rounded bg-white disabled:opacity-50"
                  >
                    <option value="">All Kelurahan</option>
                    {filteredKelurahan.map(k => (
                      <option key={k.code} value={k.code}>{k.name}</option>
                    ))}
                  </select>
                </div>
                <div className="text-[10px] text-[var(--brand-ink)]/50 mt-1">
                  Province: Bali · Country: Indonesia. Narrowing to a kelurahan scopes the scrape to a ~1.5km radius.
                </div>
              </div>

              {/* Mode-specific inputs */}
              {mode === 'keyword' ? (
                <>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">
                      Query (store name, brand, or area)
                    </Label>
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
                      <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Types</Label>
                      <div className="flex gap-2 text-[12px]">
                        {(['store', 'mall', 'poi'] as const).map(k => (
                          <label key={k} className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={kinds[k]}
                              onChange={(e) => setKinds(prev => ({ ...prev, [k]: e.target.checked }))}
                              className="rounded"
                            />
                            <span className="capitalize">{k}</span>
                          </label>
                        ))}
                      </div>
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
                </>
              ) : (
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">
                    Brands to Scrape {selectedBrands.length > 0 && <span className="text-[var(--brand-red)]">({selectedBrands.length} selected)</span>}
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto p-2 border border-[var(--brand-border)] rounded bg-white">
                    {COMPETITOR_BRANDS.map(b => (
                      <label key={b.name} className="flex items-center gap-1.5 text-[11.5px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(b.name)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedBrands(s => [...s, b.name])
                            else setSelectedBrands(s => s.filter(x => x !== b.name))
                          }}
                        />
                        <span>{b.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedBrands([])}>Clear</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedBrands(COMPETITOR_BRANDS.slice(0, 5).map(b => b.name))}>Top 5</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedBrands(COMPETITOR_BRANDS.map(b => b.name))}>All</Button>
                  </div>
                </div>
              )}

              <Button
                onClick={scrape}
                disabled={loading}
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
                    {mode === 'keyword' ? 'Scrape Now (review only)' : `Sweep ${selectedBrands.length || COMPETITOR_BRANDS.length} Brands (review only)`}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {(geo || results.length > 0 || scrapeMeta) && (
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
                {scrapeMeta && (
                  <div className="p-2 rounded-md bg-[var(--brand-cream)] border border-[var(--brand-border)] text-[11px] text-[var(--brand-ink)]/70 flex flex-wrap gap-3">
                    <span><strong>Mode:</strong> {scrapeMeta.mode === 'keyword' ? 'Keyword search' : 'Brand sweep'}</span>
                    <span><strong>Scope:</strong> {scrapeMeta.location_label}</span>
                    {scrapeMeta.brands_with_data != null && (
                      <span><strong>Brands with data:</strong> {scrapeMeta.brands_with_data} / {(scrapeMeta.brands_scraped || []).length}</span>
                    )}
                  </div>
                )}
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

                {/* Save-routing summary */}
                {results.length > 0 && (
                  <div className="p-2 rounded-md border border-[var(--brand-border)] bg-white text-[11px] flex flex-wrap gap-3 items-center">
                    <span className="font-medium text-[var(--brand-ink)]/70">On save, items will be routed to:</span>
                    {counts.maaStores > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 text-blue-700 border-blue-300 bg-blue-50">
                        <StoreIcon className="w-2.5 h-2.5 mr-1" /> {counts.maaStores} → stores table (MAA/MAP)
                      </Badge>
                    )}
                    {counts.competitors > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 text-purple-700 border-purple-300 bg-purple-50">
                        <Shield className="w-2.5 h-2.5 mr-1" /> {counts.competitors} → competitor_stores
                      </Badge>
                    )}
                    {counts.others > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 text-gray-700 border-gray-300 bg-gray-50">
                        <HelpCircle className="w-2.5 h-2.5 mr-1" /> {counts.others} → competitor_stores (other)
                      </Badge>
                    )}
                    {counts.malls > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 text-amber-700 border-amber-300 bg-amber-50">
                        <Building2 className="w-2.5 h-2.5 mr-1" /> {counts.malls} → malls table
                      </Badge>
                    )}
                    {counts.pois > 0 && (
                      <Badge variant="outline" className="text-[9px] h-4 text-green-700 border-green-300 bg-green-50">
                        <MapPin className="w-2.5 h-2.5 mr-1" /> {counts.pois} → pois table
                      </Badge>
                    )}
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
                    const cls = getClassification(r)
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
                          {/* Classification badge for store items */}
                          {cls && (
                            <div className="text-[9.5px] mt-0.5">
                              {cls.target === 'maa_store' && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  <StoreIcon className="w-2.5 h-2.5" /> → stores table (MAA/MAP)
                                </span>
                              )}
                              {cls.target === 'competitor' && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                  <Shield className="w-2.5 h-2.5" /> → competitor_stores
                                </span>
                              )}
                              {cls.target === 'other' && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-gray-50 text-gray-700 border border-gray-200">
                                  <HelpCircle className="w-2.5 h-2.5" /> → competitor_stores (other)
                                </span>
                              )}
                            </div>
                          )}
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

        {/* ============================================================ */}
        {/* RIGHT: History + info                                        */}
        {/* ============================================================ */}
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
                <div><strong>Pick a mode:</strong> Keyword search (specific name/area, geocoded via Nominatim) or Brand sweep (predefined competitor catalog, full-bbox Overpass).</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--brand-red)] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                <div><strong>Scope the location:</strong> All Bali, or narrow to a kabupaten → kecamatan → kelurahan (cascading dropdowns). Narrower scope = faster scrape + fewer false positives.</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--brand-red)] text-white text-[10px] font-bold flex items-center justify-center">3</span>
                <div><strong>Review results:</strong> Each row shows land status, classification (MAA store / competitor / other), and where it will be saved. Items marked <span className="text-amber-700 font-medium">"in sea"</span> cannot be saved.</div>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--brand-red)] text-white text-[10px] font-bold flex items-center justify-center">4</span>
                <div><strong>Save Selected:</strong> MAA/MAP brands → master <code>stores</code> table (with proper brand_id + parent). Competitors & unknown brands → <code>competitor_stores</code> table. Malls → <code>malls</code>. POIs → <code>pois</code>.</div>
              </div>
              <div className="pt-2 mt-2 border-t border-[var(--brand-border)] text-[10px] text-[var(--brand-ink)]/50">
                Rate-limited to 1 req/sec per Nominatim usage policy. All data is open (ODbL license). Source attribution preserved in the <code>source</code> field of each saved record.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
