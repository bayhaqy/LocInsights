'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Database, Plus, Edit, Trash2, Search, Store as StoreIcon, Building2, Tag, MapPin, Map,
  RefreshCw, Upload, Download, FileSpreadsheet, Save, X, Check, AlertTriangle, FileDown,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'

type EntityType = 'stores' | 'malls' | 'brands' | 'competitors' | 'kelurahan' | 'pois' | 'kabupaten' | 'kecamatan'

interface EntityMeta {
  id: EntityType
  label: string
  icon: any
  searchFields: string[]
}

const ENTITIES: EntityMeta[] = [
  { id: 'stores', label: 'Stores', icon: StoreIcon, searchFields: ['name', 'brand_name'] },
  { id: 'competitors', label: 'Competitors', icon: Shield, searchFields: ['name', 'brand_name', 'kab'] },
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
  const [viewMode, setViewMode] = useState<'table' | 'spreadsheet'>('table')

  // Spreadsheet state
  const [draft, setDraft] = useState<Record<string, any> | null>(null) // changed cells: { rowIndex: { field: value } }
  const [savingBulk, setSavingBulk] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '100', // larger for spreadsheet mode
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
    setDraft(null)
  }, [activeEntity, search])

  function openCreate() {
    setEditing({})
    setEditMode('create')
    setShowDialog(true)
  }

  function openEdit(row: any) {
    const { brand, mall, stores, Kecamatan, ...rest } = row
    setEditing(rest)
    setEditMode('edit')
    setShowDialog(true)
  }

  async function save() {
    if (!editing) return
    try {
      const isEdit = editMode === 'edit' && (editing.id || editing.code)
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

  // =========================
  // Spreadsheet mode handlers
  // =========================

  function setCell(rowIndex: number, field: string, value: any) {
    setData(prev => {
      const next = [...prev]
      next[rowIndex] = { ...next[rowIndex], [field]: value }
      return next
    })
    setDraft(prev => ({
      ...prev,
      [rowIndex]: { ...(prev?.[rowIndex] || {}), [field]: value },
    }))
  }

  function discardChanges() {
    setDraft(null)
    fetchData()
    toast.info('Changes discarded')
  }

  async function saveBulkChanges() {
    if (!draft || Object.keys(draft).length === 0) {
      toast.info('No changes to save')
      return
    }
    setSavingBulk(true)
    try {
      const idField = activeEntity === 'kabupaten' || activeEntity === 'kecamatan' ? 'code' : 'id'
      const rowsToUpdate = Object.entries(draft).map(([idx, changes]) => ({
        [idField]: data[Number(idx)][idField],
        ...changes,
      }))
      const res = await fetch('/api/locinsight/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: activeEntity, rows: rowsToUpdate }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Saved ${json.updated} of ${rowsToUpdate.length} changes${json.skipped ? ` · ${json.skipped} skipped` : ''}${json.error_count ? ` · ${json.error_count} errors` : ''}`)
        if (json.error_count > 0) {
          console.warn('Bulk update errors:', json.errors)
        }
        setDraft(null)
        fetchData()
      } else {
        toast.error(json.error)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSavingBulk(false)
    }
  }

  async function downloadExport(format: 'csv' | 'xlsx') {
    try {
      const res = await fetch(`/api/locinsight/bulk?entity=${activeEntity}&format=${format}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeEntity}_${new Date().toISOString().slice(0,10)}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported ${activeEntity} as ${format.toUpperCase()}`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function downloadTemplate(format: 'csv' | 'xlsx') {
    try {
      const res = await fetch(`/api/locinsight/bulk?entity=${activeEntity}&format=${format}&template=true`)
      if (!res.ok) throw new Error('Template download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `template_${activeEntity}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Template downloaded (${format.toUpperCase()})`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSavingBulk(true)
    try {
      const form = new FormData()
      form.append('entity', activeEntity)
      form.append('file', file)
      const res = await fetch('/api/locinsight/bulk/upload', {
        method: 'POST',
        body: form,
      })
      const json = await res.json()
      if (json.success) {
        const msg = `Imported ${file.name}: ${json.created} created, ${json.updated} updated${json.error_count ? `, ${json.error_count} errors` : ''}`
        if (json.error_count > 0) {
          toast.warning(msg)
          console.warn('Import errors:', json.errors)
        } else {
          toast.success(msg)
        }
        fetchData()
      } else {
        toast.error(json.error)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSavingBulk(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const fieldConfig = getFieldConfig(activeEntity)
  const tableColumns = fieldConfig.slice(0, 6)
  const hasChanges = draft && Object.keys(draft).length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
            Data Manager
          </h2>
          <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
            CRUD + bulk Excel-style editing + CSV/XLSX import/export with templates. All changes persist to the LocInsight database.
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

        {/* Data pane */}
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                {activeEntity}
                <Badge variant="secondary" className="text-[10px]">{total} records</Badge>
              </CardTitle>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Import/Export/Templates */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={savingBulk} className="h-7 text-[11px]">
                  <Upload className="w-3 h-3 mr-1" /> Import
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadExport('csv')} className="h-7 text-[11px]">
                  <Download className="w-3 h-3 mr-1" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadExport('xlsx')} className="h-7 text-[11px]">
                  <Download className="w-3 h-3 mr-1" /> XLSX
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadTemplate('xlsx')} className="h-7 text-[11px]">
                  <FileDown className="w-3 h-3 mr-1" /> Template
                </Button>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--brand-ink)]/40" />
                  <Input
                    placeholder={`Search ${activeEntity}…`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-7 pl-7 w-[180px] text-[12px]"
                  />
                </div>
                <Button size="sm" onClick={openCreate} className="h-7 text-[11px] bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]">
                  <Plus className="w-3 h-3 mr-1" />
                  New
                </Button>
              </div>
            </div>

            {/* View mode toggle (Table vs Spreadsheet) */}
            <div className="flex items-center justify-between mt-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList className="h-7">
                  <TabsTrigger value="table" className="text-[11px] h-5 px-2">
                    <Database className="w-3 h-3 mr-1" /> Table View
                  </TabsTrigger>
                  <TabsTrigger value="spreadsheet" className="text-[11px] h-5 px-2">
                    <FileSpreadsheet className="w-3 h-3 mr-1" /> Spreadsheet (Bulk Edit)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {viewMode === 'spreadsheet' && hasChanges && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                    {Object.keys(draft!).length} row(s) changed
                  </Badge>
                  <Button size="sm" variant="outline" onClick={discardChanges} className="h-7 text-[11px]">
                    <X className="w-3 h-3 mr-1" /> Discard
                  </Button>
                  <Button size="sm" onClick={saveBulkChanges} disabled={savingBulk} className="h-7 text-[11px] bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]">
                    {savingBulk ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'table' ? (
              <TableView
                data={data}
                loading={loading}
                columns={tableColumns}
                onEdit={openEdit}
                onDelete={remove}
              />
            ) : (
              <SpreadsheetView
                data={data}
                loading={loading}
                fields={fieldConfig}
                draft={draft || {}}
                setCell={setCell}
                onEdit={openEdit}
                onDelete={remove}
              />
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--brand-border)]">
              <div className="text-[11px] text-[var(--brand-ink)]/60">
                Page {page} of {totalPages} · {total} records
                {viewMode === 'spreadsheet' && ' · showing up to 100 per page for inline editing'}
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
                  {f.label}{f.required && <span className="text-[var(--brand-red)] ml-0.5">*</span>}
                </Label>
                {f.type === 'boolean' ? (
                  <Switch
                    checked={!!editing?.[f.key]}
                    onCheckedChange={(v) => setEditing({ ...editing, [f.key]: v })}
                  />
                ) : f.type === 'select' ? (
                  <Select
                    value={String(editing?.[f.key] ?? '')}
                    onValueChange={(v) => setEditing({ ...editing, [f.key]: v })}
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

// =============================================================
// Table View (read-only, with edit/delete actions)
// =============================================================
function TableView({
  data, loading, columns, onEdit, onDelete,
}: {
  data: any[]
  loading: boolean
  columns: FieldConfig[]
  onEdit: (row: any) => void
  onDelete: (row: any) => void
}) {
  return (
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
      <table className="w-full text-[11.5px]">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-[var(--brand-border)]">
            {columns.map(f => (
              <th key={f.key} className="text-left px-2 py-2 font-semibold text-[var(--brand-ink)]/70 uppercase tracking-wider text-[10px] whitespace-nowrap">
                {f.label}
              </th>
            ))}
            <th className="text-right px-2 py-2 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={columns.length + 1} className="py-8 text-center text-[var(--brand-ink)]/40">Loading…</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={columns.length + 1} className="py-8 text-center text-[var(--brand-ink)]/40">No records found</td></tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="border-b border-[var(--brand-border)]/50 hover:bg-[var(--brand-cream)]/50">
                {columns.map(f => (
                  <td key={f.key} className="px-2 py-1.5 whitespace-nowrap">
                    {formatCell(row[f.key], f.type)}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => onEdit(row)}
                    className="p-1 rounded hover:bg-[var(--brand-red)]/10 text-[var(--brand-ink)]/60 hover:text-[var(--brand-red)]"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(row)}
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
  )
}

// =============================================================
// Spreadsheet View (inline-editable cells, like Excel)
// =============================================================
function SpreadsheetView({
  data, loading, fields, draft, setCell, onEdit, onDelete,
}: {
  data: any[]
  loading: boolean
  fields: FieldConfig[]
  draft: Record<number, Record<string, any>>
  setCell: (rowIndex: number, field: string, value: any) => void
  onEdit: (row: any) => void
  onDelete: (row: any) => void
}) {
  // Spreadsheet shows: row#, all fields, edit, delete
  // Limit columns to keep it usable — show all fields
  if (loading) {
    return <div className="py-12 text-center text-[var(--brand-ink)]/40 text-[12px]">Loading…</div>
  }
  if (data.length === 0) {
    return <div className="py-12 text-center text-[var(--brand-ink)]/40 text-[12px]">No records found</div>
  }
  return (
    <div className="overflow-auto max-h-[600px] border border-[var(--brand-border)] rounded">
      <table className="w-full text-[11px] border-collapse">
        <thead className="sticky top-0 bg-[var(--brand-cream)] z-10">
          <tr>
            <th className="text-center px-1 py-1.5 border-r border-b border-[var(--brand-border)] font-semibold text-[var(--brand-ink)]/50 uppercase text-[9px] w-8 sticky left-0 bg-[var(--brand-cream)] z-20">#</th>
            {fields.map(f => (
              <th key={f.key} className="text-left px-2 py-1.5 border-r border-b border-[var(--brand-border)] font-semibold text-[var(--brand-ink)]/70 uppercase tracking-wider text-[9px] whitespace-nowrap min-w-[80px]">
                {f.label}
                {f.required && <span className="text-[var(--brand-red)] ml-0.5">*</span>}
              </th>
            ))}
            <th className="text-center px-1 py-1.5 border-b border-[var(--brand-border)] font-semibold text-[var(--brand-ink)]/50 w-16">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => {
            const rowChanged = !!draft[ri]
            return (
              <tr key={ri} className={rowChanged ? 'bg-amber-50/40' : 'bg-white'}>
                <td className="text-center px-1 py-0.5 border-r border-b border-[var(--brand-border)] text-[var(--brand-ink)]/40 text-[10px] font-mono sticky left-0 bg-inherit z-10">
                  {ri + 1}
                  {rowChanged && <span className="text-amber-600 ml-0.5">●</span>}
                </td>
                {fields.map(f => {
                  const value = row[f.key]
                  const changed = draft[ri]?.[f.key] !== undefined
                  return (
                    <td
                      key={f.key}
                      className={`border-r border-b border-[var(--brand-border)] p-0 ${changed ? 'bg-amber-100/60' : ''}`}
                    >
                      <CellEditor
                        field={f}
                        value={value}
                        onChange={(v) => setCell(ri, f.key, v)}
                      />
                    </td>
                  )
                })}
                <td className="text-center border-b border-[var(--brand-border)] px-1">
                  <button
                    onClick={() => onEdit(row)}
                    className="p-0.5 rounded hover:bg-[var(--brand-red)]/10 text-[var(--brand-ink)]/60 hover:text-[var(--brand-red)]"
                    title="Open in dialog"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDelete(row)}
                    className="p-0.5 rounded hover:bg-red-100 text-[var(--brand-ink)]/60 hover:text-red-600 ml-0.5"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// =============================================================
// Cell Editor — inline editable cell, type-aware
// =============================================================
function CellEditor({
  field, value, onChange,
}: {
  field: FieldConfig
  value: any
  onChange: (v: any) => void
}) {
  if (field.type === 'boolean') {
    return (
      <button
        onClick={() => onChange(!value)}
        className={`w-full h-7 flex items-center justify-center text-[10px] font-semibold transition-colors ${
          value
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
        }`}
        title={value ? 'true (click to toggle)' : 'false (click to toggle)'}
      >
        {value ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </button>
    )
  }
  if (field.type === 'select') {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-7 px-1 text-[10.5px] bg-transparent border-0 outline-none focus:bg-white focus:ring-1 focus:ring-[var(--brand-red)]"
      >
        <option value="">—</option>
        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={value ?? ''}
        step={field.step || '1'}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="w-full h-7 px-1.5 text-[10.5px] text-right bg-transparent border-0 outline-none focus:bg-white focus:ring-1 focus:ring-[var(--brand-red)] font-mono"
      />
    )
  }
  // text
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-7 px-1.5 text-[10.5px] bg-transparent border-0 outline-none focus:bg-white focus:ring-1 focus:ring-[var(--brand-red)]"
    />
  )
}

function formatCell(value: any, type?: string): React.ReactNode {
  if (value === null || value === undefined || value === '') return '—'
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
  required?: boolean
  fullWidth?: boolean
}

function getFieldConfig(entity: EntityType): FieldConfig[] {
  switch (entity) {
    case 'stores':
      return [
        { key: 'id', label: 'ID', type: 'text', required: true },
        { key: 'name', label: 'Name', type: 'text', required: true, fullWidth: true },
        { key: 'brand_id', label: 'Brand ID', type: 'text', required: true },
        { key: 'brand_name', label: 'Brand', type: 'text' },
        { key: 'brand_category', label: 'Category', type: 'select', options: ['food_beverage','sports','fashion','department_store','kids','lifestyle','beauty'] },
        { key: 'parent', label: 'Parent', type: 'select', options: ['MAP','MAA'] },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'kec', label: 'Kecamatan', type: 'text' },
        { key: 'kab', label: 'Kabupaten', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'is_in_mall', label: 'In Mall?', type: 'boolean' },
        { key: 'mall_id', label: 'Mall ID', type: 'text' },
        { key: 'mall_name', label: 'Mall Name', type: 'text' },
        { key: 'address', label: 'Address', type: 'text', fullWidth: true },
        { key: 'opened_year', label: 'Opened', type: 'number' },
        { key: 'estimated_size_m2', label: 'Size (m²)', type: 'number' },
        { key: 'confirmed', label: 'Verified?', type: 'boolean' },
        { key: 'source', label: 'Source', type: 'text', fullWidth: true },
      ]
    case 'competitors':
      return [
        { key: 'id', label: 'ID', type: 'text', required: true },
        { key: 'brand_name', label: 'Brand Name', type: 'text', required: true },
        { key: 'brand_category', label: 'Category', type: 'select', options: ['convenience_store','fast_food','coffee','fashion','beauty','supermarket','pharmacy','department_store','sports','other'] },
        { key: 'name', label: 'Outlet Name', type: 'text', required: true, fullWidth: true },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001', required: true },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001', required: true },
        { key: 'kec', label: 'Kecamatan', type: 'text' },
        { key: 'kab', label: 'Kabupaten', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'address', label: 'Address', type: 'text', fullWidth: true },
        { key: 'is_in_mall', label: 'In Mall?', type: 'boolean' },
        { key: 'mall_id', label: 'Mall ID', type: 'text' },
        { key: 'mall_name', label: 'Mall Name', type: 'text' },
        { key: 'source', label: 'Source', type: 'text' },
        { key: 'source_url', label: 'Source URL', type: 'text', fullWidth: true },
      ]
    case 'malls':
      return [
        { key: 'id', label: 'ID', type: 'text', required: true },
        { key: 'name', label: 'Name', type: 'text', required: true, fullWidth: true },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'kec', label: 'Kecamatan', type: 'text' },
        { key: 'kab', label: 'Kabupaten', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'gla_m2', label: 'GLA (m²)', type: 'number' },
        { key: 'opened_year', label: 'Opened', type: 'number' },
        { key: 'class', label: 'Class', type: 'select', options: ['super_regional','regional','community','specialty'] },
        { key: 'anchor_count', label: 'Anchors', type: 'number' },
        { key: 'has_cinema', label: 'Cinema?', type: 'boolean' },
        { key: 'has_supermarket', label: 'Supermarket?', type: 'boolean' },
        { key: 'has_department_store', label: 'Dept Store?', type: 'boolean' },
        { key: 'visitor_estimate_daily', label: 'Daily Visitors', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
        { key: 'source', label: 'Source', type: 'text', fullWidth: true },
      ]
    case 'brands':
      return [
        { key: 'id', label: 'ID', type: 'text', required: true },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'parent', label: 'Parent', type: 'select', options: ['MAP','MAA'] },
        { key: 'category', label: 'Category', type: 'select', options: ['food_beverage','sports','fashion','department_store','kids','lifestyle','beauty'] },
        { key: 'origin_country', label: 'Origin Country', type: 'text' },
        { key: 'format', label: 'Format', type: 'text' },
        { key: 'location_preference', label: 'Loc Pref', type: 'select', options: ['mall','street','both'] },
        { key: 'typical_size_m2', label: 'Size (m²)', type: 'number' },
        { key: 'price_segment', label: 'Price', type: 'select', options: ['mass','mid','premium','luxury'] },
        { key: 'brand_strength', label: 'Strength', type: 'number', step: '0.01' },
        { key: 'target_audience', label: 'Target', type: 'text', fullWidth: true },
        { key: 'city', label: 'HQ City', type: 'text' },
        { key: 'country', label: 'HQ Country', type: 'text' },
        { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
        { key: 'source', label: 'Source', type: 'text', fullWidth: true },
      ]
    case 'kelurahan':
      return [
        { key: 'id', label: 'ID', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text', required: true },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'kec_code', label: 'Kecamatan Code', type: 'text' },
        { key: 'kec_name', label: 'Kecamatan Name', type: 'text' },
        { key: 'kab_code', label: 'Kabupaten Code', type: 'text' },
        { key: 'kab_name', label: 'Kabupaten Name', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'tier', label: 'Tier (1=Metropolitan, 2=Urban, 3=Rural)', type: 'select', options: ['tier_1','tier_2','tier_3'] },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'population', label: 'Population (people)', type: 'number' },
        { key: 'area_km2', label: 'Area (km²)', type: 'number', step: '0.1' },
        { key: 'density', label: 'Population Density (per km²)', type: 'number' },
        { key: 'urban_index', label: 'Urbanization Index (0-100)', type: 'number' },
        { key: 'income_index', label: 'Income Index (0-100)', type: 'number' },
        { key: 'tourist_index', label: 'Tourist Index (0-100)', type: 'number' },
        { key: 'transport_index', label: 'Transport Index (0-100)', type: 'number' },
        { key: 'poi_density_index', label: 'POI Density Index (0-100)', type: 'number' },
        { key: 'is_coastal', label: 'Is Coastal Area?', type: 'boolean' },
        { key: 'source', label: 'Data Source', type: 'text', fullWidth: true },
      ]
    case 'pois':
      return [
        { key: 'id', label: 'ID', type: 'text', required: true },
        { key: 'name', label: 'Name', type: 'text', required: true, fullWidth: true },
        { key: 'type', label: 'Type', type: 'select', options: ['tourist_attraction','beach','temple','hotel_cluster','transit_hub','university','hospital','office_cluster','port'] },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'kec', label: 'Kecamatan', type: 'text' },
        { key: 'kab', label: 'Kabupaten', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'magnitude', label: 'Magnitude', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
        { key: 'source', label: 'Source', type: 'text', fullWidth: true },
      ]
    case 'kabupaten':
      return [
        { key: 'code', label: 'Code (BPS 4-digit)', type: 'text', required: true },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'type', label: 'Type (Kabupaten/Kota)', type: 'select', options: ['Kabupaten','Kota'] },
        { key: 'capital', label: 'Capital City', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'province', label: 'Province', type: 'text' },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'tier', label: 'Tier (1=Metropolitan, 2=Urban, 3=Rural)', type: 'select', options: ['tier_1','tier_2','tier_3'] },
        { key: 'population_2024', label: 'Population 2024 (people)', type: 'number' },
        { key: 'area_km2', label: 'Area (km²)', type: 'number', step: '0.1' },
        { key: 'population_density', label: 'Population Density (per km²)', type: 'number' },
        { key: 'gdrp_per_capita_juta', label: 'GDRP per Capita (Juta Rp / million IDR)', type: 'number', step: '0.1' },
        { key: 'hdmi_2024', label: 'HDI Score 2024 (0-1, Human Development Index)', type: 'number', step: '0.001' },
        { key: 'tourist_hotels', label: 'Tourist Hotels (count)', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
        { key: 'source', label: 'Data Source', type: 'text', fullWidth: true },
      ]
    case 'kecamatan':
      return [
        { key: 'code', label: 'Code (BPS 6-digit)', type: 'text', required: true },
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'kabupaten_code', label: 'Kabupaten Code', type: 'text' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' },
        { key: 'province', label: 'Province', type: 'text' },
        { key: 'lat', label: 'Latitude', type: 'number', step: '0.0001' },
        { key: 'lng', label: 'Longitude', type: 'number', step: '0.0001' },
        { key: 'tier', label: 'Tier (1=Metropolitan, 2=Urban, 3=Rural)', type: 'select', options: ['tier_1','tier_2','tier_3'] },
        { key: 'population_2024', label: 'Population 2024 (people)', type: 'number' },
        { key: 'area_km2', label: 'Area (km²)', type: 'number', step: '0.1' },
        { key: 'urban_score', label: 'Urbanization Score (0-100)', type: 'number' },
        { key: 'is_capital', label: 'Is Kabupaten Capital?', type: 'boolean' },
        { key: 'source', label: 'Data Source', type: 'text', fullWidth: true },
      ]
  }
  return []
}
