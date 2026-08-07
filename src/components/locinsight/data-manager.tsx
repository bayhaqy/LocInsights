'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Database, Plus, Edit, Trash2, Search, Store, Building2, Tag, MapPin, Map, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

type EntityType = 'stores' | 'malls' | 'brands' | 'kelurahan' | 'pois' | 'kabupaten' | 'kecamatan'

interface EntityMeta {
  id: EntityType
  label: string
  icon: any
  searchFields: string[]
}

const ENTITIES: EntityMeta[] = [
  { id: 'stores', label: 'Stores', icon: Store, searchFields: ['name', 'brand_name'] },
  { id: 'malls', label: 'Malls', icon: Building2, searchFields: ['name'] },
  { id: 'brands', label: 'Brands', icon: Tag, searchFields: ['name'] },
  { id: 'kelurahan', label: 'Kelurahan', icon: MapPin, searchFields: ['name', 'kec_name', 'kab_name'] },
  { id: 'pois', label: 'POIs', icon: MapPin, searchFields: ['name'] },
  { id: 'kabupaten', label: 'Kabupaten', icon: Map, searchFields: ['name', 'capital'] },
  { id: 'kecamatan', label: 'Kecamatan', icon: Map, searchFields: ['name'] },
]

export function DataManager() {
  const [activeEntity, setActiveEntity] = useState<EntityType>('stores')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '25',
      })
      if (search) params.set('search', search)
      const res = await fetch(`/api/locinsight/${activeEntity}?${params}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
        setTotal(json.total)
        setTotalPages(json.totalPages)
      } else {
        toast.error(json.error)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [activeEntity, search, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPage(1)
  }, [activeEntity, search])

  function openCreate() {
    setEditing({})
    setEditMode('create')
    setShowDialog(true)
  }

  function openEdit(row: any) {
    // Strip relations for editing
    const { brand, mall, stores, Kecamatan, ...rest } = row
    setEditing(rest)
    setEditMode('edit')
    setShowDialog(true)
  }

  async function save() {
    if (!editing) return
    try {
      const isEdit = editMode === 'edit' && editing.id
      const idField = activeEntity === 'kabupaten' || activeEntity === 'kecamatan' ? editing.code : editing.id
      const url = isEdit
        ? `/api/locinsight/${activeEntity}/${encodeURIComponent(idField)}`
        : `/api/locinsight/${activeEntity}`
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(isEdit ? 'Record updated' : 'Record created')
        setShowDialog(false)
        setEditing(null)
        fetchData()
      } else {
        toast.error(json.error)
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function remove(row: any) {
    const idField = activeEntity === 'kabupaten' || activeEntity === 'kecamatan' ? row.code : row.id
    if (!confirm(`Delete "${row.name || row.code}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/locinsight/${activeEntity}/${encodeURIComponent(idField)}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Record deleted')
        fetchData()
      } else {
        toast.error(json.error)
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Determine which fields to show in table + form
  const fieldConfig = getFieldConfig(activeEntity)
  const tableColumns = fieldConfig.slice(0, 6) // show first 6 fields in table

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
            Data Manager
          </h2>
          <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
            CRUD operations for all master data. Changes persist to the LocInsight database.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="h-8"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        {/* Entity switcher */}
        <Card className="card-premium h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-[var(--brand-red)]" />
              Master Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {ENTITIES.map(e => {
              const Icon = e.icon
              const isActive = activeEntity === e.id
              return (
                <button
                  key={e.id}
                  onClick={() => setActiveEntity(e.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors text-[12.5px] ${
                    isActive
                      ? 'bg-[var(--brand-red)] text-white'
                      : 'text-[var(--brand-ink)]/70 hover:bg-[var(--brand-cream)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="capitalize">{e.label}</span>
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* Data table */}
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                {activeEntity}
                <Badge variant="secondary" className="text-[10px]">{total} records</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--brand-ink)]/40" />
                  <Input
                    placeholder={`Search ${activeEntity}…`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-7 w-[200px] text-[12px]"
                  />
                </div>
                <Button size="sm" onClick={openCreate} className="h-8 bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr className="border-b border-[var(--brand-border)]">
                    {tableColumns.map(f => (
                      <th key={f.key} className="text-left px-2 py-2 font-semibold text-[var(--brand-ink)]/70 uppercase tracking-wider text-[10px]">
                        {f.label}
                      </th>
                    ))}
                    <th className="text-right px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={tableColumns.length + 1} className="py-8 text-center text-[var(--brand-ink)]/40">Loading…</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={tableColumns.length + 1} className="py-8 text-center text-[var(--brand-ink)]/40">No records found</td></tr>
                  ) : (
                    data.map((row, i) => (
                      <tr key={i} className="border-b border-[var(--brand-border)]/50 hover:bg-[var(--brand-cream)]/50">
                        {tableColumns.map(f => (
                          <td key={f.key} className="px-2 py-1.5">
                            {formatCell(row[f.key], f.type)}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => openEdit(row)}
                            className="p-1 rounded hover:bg-[var(--brand-red)]/10 text-[var(--brand-ink)]/60 hover:text-[var(--brand-red)]"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => remove(row)}
                            className="p-1 rounded hover:bg-red-100 text-[var(--brand-ink)]/60 hover:text-red-600 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--brand-border)]">
              <div className="text-[11px] text-[var(--brand-ink)]/60">
                Page {page} of {totalPages} · {total} records
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page === 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-7 text-[11px]">
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page === totalPages || loading} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-7 text-[11px]">
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode === 'create' ? 'Create' : 'Edit'} {activeEntity.replace(/s$/, '')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {fieldConfig.map(f => (
              <div key={f.key} className={f.fullWidth ? 'col-span-2' : ''}>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1 block">
                  {f.label}
                </Label>
                {f.type === 'boolean' ? (
                  <Switch
                    checked={!!editing?.[f.key]}
                    onCheckedChange={(v) => setEditing({ ...editing, [f.key]: v })}
                  />
                ) : f.type === 'select' ? (
                  <Select
                    value={String(editing?.[f.key] ?? '')}
                    onValueChange={(v) => setEditing({ ...editing, [f.key]: f.options?.includes(v) ? v : Number(v) })}
                  >
                    <SelectTrigger className="h-9 text-[12px]"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {f.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type === 'number' ? 'number' : 'text'}
                    value={editing?.[f.key] ?? ''}
                    onChange={(e) => setEditing({ ...editing, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
                    className="h-9 text-[12px]"
                    step={f.step || '1'}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save} className="bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]">
              {editMode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatCell(value: any, type?: string): React.ReactNode {
  if (value === null || value === undefined) return '—'
  if (type === 'boolean') return value ? '✓' : '—'
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'string' && value.length > 60) return value.slice(0, 57) + '…'
  return String(value)
}

interface FieldConfig {
  key: string
  label: string
  type?: 'text' | 'number' | 'boolean' | 'select'
  options?: string[]
  step?: string
  fullWidth?: boolean
}

function getFieldConfig(entity: EntityType): FieldConfig[] {
  switch (entity) {
    case 'stores':
      return [
        { key: 'id', label: 'ID', type: 'text' },
        { key: 'name', label: 'Name', type: 'text', fullWidth: true },
        { key: 'brand_name', label: 'Brand', type: 'text' },
        { key: 'brand_category', label: 'Category', type: 'select', options: ['food_beverage', 'sports', 'fashion', 'department_store', 'kids', 'lifestyle', 'beauty'] },
        { key: 'parent', label: 'Parent', type: 'select', options: ['MAP', 'MAA'] },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'kab', label: 'Kabupaten', type: 'text' },
        { key: 'kec', label: 'Kecamatan', type: 'text' },
        { key: 'address', label: 'Address', type: 'text', fullWidth: true },
        { key: 'is_in_mall', label: 'In Mall?', type: 'boolean' },
        { key: 'mall_name', label: 'Mall Name', type: 'text' },
        { key: 'opened_year', label: 'Opened', type: 'number' },
        { key: 'confirmed', label: 'Verified?', type: 'boolean' },
      ]
    case 'malls':
      return [
        { key: 'id', label: 'ID', type: 'text' },
        { key: 'name', label: 'Name', type: 'text', fullWidth: true },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'kab', label: 'Kabupaten', type: 'text' },
        { key: 'kec', label: 'Kecamatan', type: 'text' },
        { key: 'gla_m2', label: 'GLA (m²)', type: 'number' },
        { key: 'opened_year', label: 'Opened', type: 'number' },
        { key: 'class', label: 'Class', type: 'select', options: ['super_regional', 'regional', 'community', 'specialty'] },
        { key: 'anchor_count', label: 'Anchors', type: 'number' },
        { key: 'has_cinema', label: 'Cinema?', type: 'boolean' },
        { key: 'has_supermarket', label: 'Supermarket?', type: 'boolean' },
        { key: 'has_department_store', label: 'Dept Store?', type: 'boolean' },
        { key: 'visitor_estimate_daily', label: 'Daily Visitors', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
      ]
    case 'brands':
      return [
        { key: 'id', label: 'ID', type: 'text' },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'parent', label: 'Parent', type: 'select', options: ['MAP', 'MAA'] },
        { key: 'category', label: 'Category', type: 'select', options: ['food_beverage', 'sports', 'fashion', 'department_store', 'kids', 'lifestyle', 'beauty'] },
        { key: 'origin_country', label: 'Origin', type: 'text' },
        { key: 'format', label: 'Format', type: 'text' },
        { key: 'location_preference', label: 'Loc Pref', type: 'select', options: ['mall', 'street', 'both'] },
        { key: 'typical_size_m2', label: 'Size (m²)', type: 'number' },
        { key: 'price_segment', label: 'Price', type: 'select', options: ['mass', 'mid', 'premium', 'luxury'] },
        { key: 'brand_strength', label: 'Strength', type: 'number', step: '0.01' },
        { key: 'target_audience', label: 'Target', type: 'text', fullWidth: true },
        { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
      ]
    case 'kelurahan':
      return [
        { key: 'id', label: 'ID', type: 'text' },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'kec_name', label: 'Kecamatan', type: 'text' },
        { key: 'kab_name', label: 'Kabupaten', type: 'text' },
        { key: 'tier', label: 'Tier', type: 'select', options: ['1', '2', '3'] },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'population', label: 'Population', type: 'number' },
        { key: 'area_km2', label: 'Area (km²)', type: 'number', step: '0.1' },
        { key: 'density', label: 'Density', type: 'number' },
        { key: 'urban_index', label: 'Urban Idx', type: 'number' },
        { key: 'income_index', label: 'Income Idx', type: 'number' },
        { key: 'tourist_index', label: 'Tourist Idx', type: 'number' },
        { key: 'transport_index', label: 'Transport Idx', type: 'number' },
        { key: 'poi_density_index', label: 'POI Idx', type: 'number' },
        { key: 'is_coastal', label: 'Coastal?', type: 'boolean' },
      ]
    case 'pois':
      return [
        { key: 'id', label: 'ID', type: 'text' },
        { key: 'name', label: 'Name', type: 'text', fullWidth: true },
        { key: 'type', label: 'Type', type: 'select', options: ['tourist_attraction', 'beach', 'temple', 'hotel_cluster', 'transit_hub', 'university', 'hospital', 'office_cluster', 'port'] },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'kab', label: 'Kabupaten', type: 'text' },
        { key: 'kec', label: 'Kecamatan', type: 'text' },
        { key: 'magnitude', label: 'Magnitude', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
      ]
    case 'kabupaten':
      return [
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'type', label: 'Type', type: 'select', options: ['Kabupaten', 'Kota'] },
        { key: 'capital', label: 'Capital', type: 'text' },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'tier', label: 'Tier', type: 'select', options: ['1', '2', '3'] },
        { key: 'population_2024', label: 'Population', type: 'number' },
        { key: 'area_km2', label: 'Area (km²)', type: 'number', step: '0.1' },
        { key: 'population_density', label: 'Density', type: 'number' },
        { key: 'gdrp_per_capita_juta', label: 'GDRP/cap (jt)', type: 'number', step: '0.1' },
        { key: 'hdmi_2024', label: 'HDMI', type: 'number', step: '0.001' },
        { key: 'tourist_hotels', label: 'Hotels', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
      ]
    case 'kecamatan':
      return [
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'kabupaten_code', label: 'Kab Code', type: 'text' },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'tier', label: 'Tier', type: 'select', options: ['1', '2', '3'] },
        { key: 'population_2024', label: 'Population', type: 'number' },
        { key: 'area_km2', label: 'Area (km²)', type: 'number', step: '0.1' },
        { key: 'urban_score', label: 'Urban Score', type: 'number' },
        { key: 'is_capital', label: 'Capital?', type: 'boolean' },
      ]
  }
  return []
}
