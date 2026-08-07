'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { FileText, Download, FileSpreadsheet, FileJson, Printer, Clock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReportHistoryItem {
  id: string
  title: string
  type: string
  format: string
  status: string
  file_path: string | null
  file_size_kb: number | null
  createdAt: string
}

export function Reports() {
  const [reportType, setReportType] = useState<'executive_summary' | 'site_analysis' | 'brand_expansion' | 'regional_comparison'>('executive_summary')
  const [format, setFormat] = useState<'json' | 'csv' | 'html'>('html')
  const [tier, setTier] = useState<string>('all')
  const [brandId, setBrandId] = useState<string>('all')
  const [minScore, setMinScore] = useState<string>('')
  const [limit, setLimit] = useState<string>('100')
  const [history, setHistory] = useState<ReportHistoryItem[]>([])
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function generateReport() {
    setLoading(true)
    setPreviewHtml(null)
    try {
      const params = new URLSearchParams({
        type: reportType,
        format,
      })
      if (tier !== 'all') params.set('tier', tier)
      if (brandId !== 'all') params.set('brand_id', brandId)
      if (minScore) params.set('min_score', minScore)
      if (limit) params.set('limit', limit)

      const res = await fetch(`/api/locinsight/reports?${params.toString()}`)
      if (!res.ok) throw new Error(await res.text())

      if (format === 'html') {
        const html = await res.text()
        setPreviewHtml(html)
        toast.success('Report generated — preview ready. Use your browser print dialog (Ctrl+P) to save as PDF.')
      } else if (format === 'csv') {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `locinsight_${reportType}_${Date.now()}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV downloaded')

        // Add to history
        const reportId = res.headers.get('X-Report-Id')
        if (reportId) {
          setHistory(h => [{
            id: reportId,
            title: `locinsight_${reportType}`,
            type: reportType,
            format: 'csv',
            status: 'generated',
            file_path: null,
            file_size_kb: Math.ceil(blob.size / 1024),
            createdAt: new Date().toISOString(),
          }, ...h])
        }
      } else if (format === 'json') {
        const json = await res.json()
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `locinsight_${reportType}_${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('JSON downloaded')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  function printPreview() {
    if (!previewHtml) return
    const w = window.open('', '_blank')
    if (!w) {
      toast.error('Pop-up blocked. Allow pop-ups to print.')
      return
    }
    w.document.write(previewHtml)
    w.document.close()
    setTimeout(() => w.print(), 800)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="font-display text-[24px] font-bold text-[var(--brand-ink)] leading-tight">
          Reports & Export
        </h2>
        <p className="text-[13px] text-[var(--brand-ink)]/60 mt-0.5">
          Generate detailed reports for executive review, BD presentations, and operational planning
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* Left: Preview */}
        <Card className="card-premium overflow-hidden">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-[var(--brand-red)]" />
              Report Preview
            </CardTitle>
            {previewHtml && (
              <Button size="sm" variant="default" onClick={printPreview} className="h-8 text-[12px]">
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print / Save as PDF
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {previewHtml ? (
              <iframe
                title="Report Preview"
                srcDoc={previewHtml}
                className="w-full border border-[var(--brand-border)] rounded-md bg-white"
                style={{ height: 'calc(100vh - 320px)', minHeight: '500px' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-[var(--brand-ink)]/40" style={{ height: '400px' }}>
                <FileText className="w-12 h-12 mb-3 opacity-50" />
                <div className="text-[14px] font-medium">No report generated yet</div>
                <div className="text-[12px] mt-1 max-w-xs">
                  Configure the report on the right, then click "Generate Report" to preview.
                  For PDF, use "Print / Save as PDF" after preview.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Config */}
        <div className="space-y-3">
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                Report Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Report Type</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executive_summary">Executive Summary (KPIs + top 10)</SelectItem>
                    <SelectItem value="site_analysis">Site Analysis (per-kelurahan deep dive)</SelectItem>
                    <SelectItem value="brand_expansion">Brand Expansion Matrix (per-brand)</SelectItem>
                    <SelectItem value="regional_comparison">Regional Comparison (per-kabupaten)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as any)}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML (printable → PDF)</SelectItem>
                    <SelectItem value="csv">CSV (Excel-compatible)</SelectItem>
                    <SelectItem value="json">JSON (API/raw)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Tier Filter</Label>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger className="h-9 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="1">Tier 1 (Mature)</SelectItem>
                    <SelectItem value="2">Tier 2 (Growth)</SelectItem>
                    <SelectItem value="3">Tier 3 (Untapped)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Min Score</Label>
                  <Input
                    type="number"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    placeholder="0"
                    className="h-9 text-[12px]"
                  />
                </div>
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block">Limit</Label>
                  <Input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="100"
                    className="h-9 text-[12px]"
                  />
                </div>
              </div>

              <Button
                onClick={generateReport}
                disabled={loading}
                className="w-full bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)] text-white"
              >
                {loading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-[12px] uppercase tracking-wider text-[var(--brand-ink)] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[var(--brand-ink)]" />
                Recent Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-[12px] text-[var(--brand-ink)]/40 py-6 text-center">
                  No reports generated yet
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {history.map(r => (
                    <div key={r.id} className="flex items-start gap-2 p-2 rounded border border-[var(--brand-border)] bg-white">
                      <div className="flex-shrink-0 mt-0.5">
                        {r.format === 'csv' ? <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" /> :
                         r.format === 'json' ? <FileJson className="w-3.5 h-3.5 text-blue-600" /> :
                         <FileText className="w-3.5 h-3.5 text-[var(--brand-red)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] font-medium truncate">{r.title}</div>
                        <div className="text-[10px] text-[var(--brand-ink)]/50">
                          {new Date(r.createdAt).toLocaleString()} · {r.file_size_kb} KB
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-green-600" />
                        Done
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
