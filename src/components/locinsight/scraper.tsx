'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Search, MapPin, Database, Loader2, CheckCircle2, XCircle, Clock, ExternalLink, Trash2 } from 'lucide-react'
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
  saved: boolean
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

export function Scraper() {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'store' | 'mall' | 'poi' | 'all'>('all')
  const [radius, setRadius] = useState('5')
  const [save, setSave] = useState(true)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ScraperResult[]>([])
  const [geo, setGeo] = useState<{ lat: number; lng: number; display_name: string; is_in_bali: boolean } | null>(null)
  const [totalFound, setTotalFound] = useState(0)
  const [totalSaved, setTotalSaved] = useState(0)
  const [history, setHistory] = useState<ScraperRun[]>([])

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
    try {
      const res = await fetch('/api/locinsight/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, kind, save, radius_km: Number(radius) }),
      })
      const json = await res.json()
      if (json.success) {
        setGeo(json.geocoded)
        setResults(json.results || [])
        setTotalFound(json.total_found)
        setTotalSaved(json.total_saved)
        toast.success(`Found ${json.total_found} items, saved ${json.total_saved} new records`)
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          Data Scraper
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          Auto-discover new stores, malls, and POIs by name or region using OpenStreetMap (Nominatim + Overpass API). Free, no API key required.
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

              <div className="grid grid-cols-3 gap-2">
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
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Auto-save</Label>
                  <div className="h-9 flex items-center">
                    <Switch checked={save} onCheckedChange={setSave} />
                    <span className="ml-2 text-[11px] text-[var(--brand-ink)]/70">{save ? 'On' : 'Off'}</span>
                  </div>
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
                    Scrape Now
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
                <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[var(--brand-red)]" />
                    Results
                  </span>
                  <span className="text-[11px] font-normal text-[var(--brand-ink)]/60">
                    Found: <strong className="text-[var(--brand-red)]">{totalFound}</strong> · Saved: <strong className="text-green-600">{totalSaved}</strong>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {geo && (
                  <div className="mb-3 p-3 rounded-md bg-[var(--brand-cream)] border border-[var(--brand-border)] text-[12px]">
                    <div className="font-semibold">{geo.display_name}</div>
                    <div className="text-[11px] text-[var(--brand-ink)]/60 mt-0.5">
                      <Badge variant={geo.is_in_bali ? 'default' : 'secondary'} className="text-[9px] h-4 mr-1">
                        {geo.is_in_bali ? 'In Bali' : 'Outside Bali'}
                      </Badge>
                      <span className="font-mono">{geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}</span>
                    </div>
                  </div>
                )}
                <div className="max-h-[500px] overflow-y-auto space-y-1.5">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded border border-[var(--brand-border)] bg-white">
                      <div className="flex-shrink-0 mt-0.5">
                        {r.saved ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> :
                         !r.on_land ? <XCircle className="w-3.5 h-3.5 text-amber-500" /> :
                         <MapPin className="w-3.5 h-3.5 text-[var(--brand-ink)]/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium truncate">{r.name}</div>
                        <div className="text-[10.5px] text-[var(--brand-ink)]/60">{r.category}</div>
                        <div className="text-[10px] text-[var(--brand-ink)]/40 mt-0.5 font-mono">
                          {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                          {!r.on_land && ' · outside land'}
                          {!r.saved && r.on_land && ' · duplicate'}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-4">{r.kind}</Badge>
                    </div>
                  ))}
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
                Data Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11.5px] text-[var(--brand-ink)]/70 space-y-2">
              <div className="flex items-start gap-2">
                <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-[var(--brand-ink)]">Nominatim</div>
                  <div className="text-[10.5px] text-[var(--brand-ink)]/60">OpenStreetMap geocoder — converts place names to lat/lng</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-[var(--brand-ink)]">Overpass API</div>
                  <div className="text-[10.5px] text-[var(--brand-ink)]/60">Queries raw OSM data — POIs, shops, amenities within bbox</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-green-600" />
                <div>
                  <div className="font-semibold text-[var(--brand-ink)]">Land validation</div>
                  <div className="text-[10.5px] text-[var(--brand-ink)]/60">Each result checked against Bali land polygon (1km tolerance for beaches)</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-green-600" />
                <div>
                  <div className="font-semibold text-[var(--brand-ink)]">Deduplication</div>
                  <div className="text-[10.5px] text-[var(--brand-ink)]/60">Existing records within 50m are skipped automatically</div>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t border-[var(--brand-border)] text-[10px] text-[var(--brand-ink)]/50">
                Rate-limited to 1 request/sec per Nominatim usage policy (Aug 2026). All data is open (ODbL license).
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
