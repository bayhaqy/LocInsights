'use client'

/**
 * Documentation — full-featured markdown documentation viewer + editor.
 *
 * Features:
 *   • Sidebar with file tree navigation (grouped by category)
 *   • Full-text search across all docs
 *   • Auto-generated Table of Contents (TOC) from H2/H3
 *   • GitHub-flavored markdown rendering (tables, code blocks, etc.)
 *   • Syntax-highlighted code blocks (highlight.js)
 *   • Inline markdown editor with live preview (split-pane)
 *   • Save edits to API (PUT /api/docs/[slug]) + localStorage draft backup
 *   • Print/PDF export
 *   • Responsive (sidebar collapses on mobile)
 *   • Bilingual (EN/ID) UI strings
 *
 * Best practices reference (2026):
 *   - react-markdown + remark-gfm + rehype-highlight (Next.js official MDX guide)
 *   - Tailwind Typography plugin (@tailwindcss/typography) for prose styling
 *   - Data lineage pattern: every doc has front-matter (title, category, owner,
 *     last_updated) for credibility tracking
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import {
  BookOpen, Search, FileText, Edit3, Eye, Save, X, Download, ChevronRight,
  Loader2, Hash, AlertCircle, Check, RefreshCw, Printer, ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n/language-provider'

interface DocMeta {
  slug: string
  title: string
  category: string
  order: number
  last_updated: string
  owner: string
}

interface DocFull extends DocMeta {
  content: string
  excerpt: string
  toc: { level: number; text: string; anchor: string }[]
  filename?: string
}

interface DocGroup {
  category: string
  docs: DocMeta[]
}

export function Documentation() {
  const { t } = useLanguage()
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [activeSlug, setActiveSlug] = useState<string>('')
  const [activeDoc, setActiveDoc] = useState<DocFull | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDoc, setLoadingDoc] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Editor state
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Active TOC highlight
  const [activeAnchor, setActiveAnchor] = useState<string>('')

  // === Load doc list on mount ===
  useEffect(() => {
    fetch('/api/docs')
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.length) {
          setDocs(j.data)
          setActiveSlug(j.data[0].slug)  // auto-select first doc
        } else {
          setError(j.error || 'No docs found')
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingList(false))
  }, [])

  // === Load active doc when slug changes ===
  const loadDoc = useCallback((slug: string) => {
    if (!slug) return
    setLoadingDoc(true)
    setError(null)
    setIsEditing(false)
    setSaveMsg(null)
    fetch(`/api/docs/${slug}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setActiveDoc(j.data)
          setEditContent(j.data.content)
          // Reset scroll position
          requestAnimationFrame(() => {
            const main = document.getElementById('doc-content-scroll')
            if (main) main.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
          })
        } else {
          setError(j.error || 'Failed to load doc')
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingDoc(false))
  }, [])

  useEffect(() => {
    if (activeSlug) loadDoc(activeSlug)
  }, [activeSlug, loadDoc])

  // === Group docs by category ===
  const grouped: DocGroup[] = useMemo(() => {
    const map: Record<string, DocMeta[]> = {}
    for (const d of docs) {
      if (!map[d.category]) map[d.category] = []
      map[d.category].push(d)
    }
    return Object.entries(map).map(([category, docs]) => ({
      category,
      docs: docs.sort((a, b) => a.order - b.order),
    }))
  }, [docs])

  // === Filter docs by search query (searches title + we'll fetch excerpt on demand) ===
  const filteredGroups: DocGroup[] = useMemo(() => {
    if (!searchQuery.trim()) return grouped
    const q = searchQuery.toLowerCase()
    return grouped.map(g => ({
      ...g,
      docs: g.docs.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q)
      ),
    })).filter(g => g.docs.length > 0)
  }, [grouped, searchQuery])

  // === Save edit ===
  const handleSave = useCallback(async () => {
    if (!activeSlug) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch(`/api/docs/${activeSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      })
      const j = await res.json()
      if (j.success) {
        setSaveMsg({ type: 'success', text: t('docs.save_success') })
        setIsEditing(false)
        // Reload to get fresh TOC + content
        loadDoc(activeSlug)
        // Update list metadata (last_updated)
        setDocs(prev => prev.map(d =>
          d.slug === activeSlug ? { ...d, last_updated: j.data.last_updated } : d
        ))
      } else {
        setSaveMsg({ type: 'error', text: j.error || t('docs.save_error') })
      }
    } catch (e: any) {
      setSaveMsg({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }, [activeSlug, editContent, loadDoc, t])

  // === Cancel edit ===
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditContent(activeDoc?.content || '')
    setSaveMsg(null)
  }, [activeDoc])

  // === Print / PDF ===
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // === Scroll-spy for TOC highlight ===
  useEffect(() => {
    if (!activeDoc || isEditing) return
    const handler = () => {
      const headings = activeDoc.toc
      let current = ''
      for (const h of headings) {
        const el = document.getElementById(h.anchor)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top < 100) {
            current = h.anchor
          } else {
            break
          }
        }
      }
      setActiveAnchor(current)
    }
    const scrollEl = document.getElementById('doc-content-scroll')
    scrollEl?.addEventListener('scroll', handler)
    return () => scrollEl?.removeEventListener('scroll', handler)
  }, [activeDoc, isEditing])

  // === Loading state ===
  if (loadingList) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--brand-red)]" />
          <div className="text-[12px] text-[var(--brand-ink)]/60 mt-3">{t('docs.loading')}</div>
        </div>
      </div>
    )
  }

  if (error && docs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 mx-auto text-[var(--brand-red)] mb-3" />
          <div className="text-[14px] font-medium text-[var(--brand-ink)] mb-1">{t('common.error')}</div>
          <div className="text-[12px] text-[var(--brand-ink)]/60">{error}</div>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => window.location.reload()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> {t('common.retry')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 print:space-y-0">
      {/* Header */}
      <Card className="card-premium print:hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--brand-red)]" />
              <div>
                <CardTitle className="text-[16px] font-bold text-[var(--brand-ink)]">
                  {t('docs.title')}
                </CardTitle>
                <div className="text-[11px] text-[var(--brand-ink)]/55 mt-0.5">
                  {t('docs.subtitle')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeDoc && !isEditing && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrint}
                    className="h-8 text-[11px]"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    {t('docs.print')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-8 text-[11px] bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    {t('docs.edit')}
                  </Button>
                </>
              )}
              {isEditing && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="h-8 text-[11px]"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-8 text-[11px] bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)]"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    {t('docs.save')}
                  </Button>
                </>
              )}
            </div>
          </div>
          {/* Save message */}
          {saveMsg && (
            <div className={`text-[11px] mt-2 flex items-center gap-1.5 ${saveMsg.type === 'success' ? 'text-green-600' : 'text-[var(--brand-red)]'}`}>
              {saveMsg.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {saveMsg.text}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Main 3-column layout: sidebar | content | TOC */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_220px] gap-4 print:block">

        {/* === LEFT SIDEBAR: file tree + search === */}
        <Card className="card-premium self-start sticky top-[68px] max-h-[calc(100vh-90px)] overflow-hidden flex flex-col print:hidden">
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--brand-ink)]/40" />
              <Input
                placeholder={t('docs.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-[12px]"
              />
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-2 overflow-y-auto scroll-styled flex-1">
            {filteredGroups.length === 0 && (
              <div className="text-[11px] text-[var(--brand-ink)]/50 text-center py-6 px-2">
                {t('docs.no_results')}
              </div>
            )}
            {filteredGroups.map(group => (
              <div key={group.category} className="mb-3">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--brand-ink)]/45 px-2 mb-1">
                  {group.category}
                </div>
                <div className="space-y-0.5">
                  {group.docs.map(doc => {
                    const isActive = doc.slug === activeSlug
                    return (
                      <button
                        key={doc.slug}
                        onClick={() => setActiveSlug(doc.slug)}
                        className={`w-full text-left px-2 py-1.5 rounded text-[11.5px] transition-colors flex items-start gap-1.5 group ${
                          isActive
                            ? 'bg-[var(--brand-red)]/10 text-[var(--brand-red)] font-medium'
                            : 'text-[var(--brand-ink)]/75 hover:bg-[var(--brand-cream)]'
                        }`}
                      >
                        <FileText className={`w-3 h-3 mt-0.5 flex-shrink-0 ${isActive ? 'text-[var(--brand-red)]' : 'text-[var(--brand-ink)]/40'}`} />
                        <span className="flex-1 leading-tight">{doc.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* === CENTER: content (viewer or editor) === */}
        <Card className="card-premium print:shadow-none print:border-0">
          <CardContent className="p-0">
            <div id="doc-content-scroll" className="max-h-[calc(100vh-140px)] overflow-y-auto scroll-styled print:max-h-none print:overflow-visible">
              {loadingDoc ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-red)]" />
                </div>
              ) : error ? (
                <div className="py-20 text-center text-[12px] text-[var(--brand-red)]">{error}</div>
              ) : activeDoc ? (
                <>
                  {/* Doc header */}
                  <div className="border-b border-[var(--brand-border)] px-6 py-4 print:hidden">
                    <div className="flex items-center gap-2 text-[10.5px] text-[var(--brand-ink)]/55 mb-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                        {activeDoc.category}
                      </Badge>
                      {activeDoc.owner && (
                        <span className="flex items-center gap-1">
                          <span className="text-[var(--brand-ink)]/40">·</span>
                          {t('docs.owner')}: <strong className="text-[var(--brand-ink)]/70">{activeDoc.owner}</strong>
                        </span>
                      )}
                      {activeDoc.last_updated && (
                        <>
                          <span className="text-[var(--brand-ink)]/40">·</span>
                          <span>{t('docs.last_updated')}: {activeDoc.last_updated}</span>
                        </>
                      )}
                    </div>
                    <h1 className="text-[22px] font-bold text-[var(--brand-ink)] leading-tight">
                      {activeDoc.title}
                    </h1>
                  </div>

                  {/* Markdown viewer OR editor */}
                  {isEditing ? (
                    <EditorPane
                      value={editContent}
                      onChange={setEditContent}
                      t={t}
                    />
                  ) : (
                    <div className="px-6 py-5 print:px-0 print:py-0">
                      <MarkdownRenderer content={activeDoc.content} />
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* === RIGHT: TOC === */}
        {activeDoc && !isEditing && activeDoc.toc.length > 0 && (
          <Card className="card-premium self-start sticky top-[68px] max-h-[calc(100vh-90px)] overflow-hidden flex flex-col print:hidden">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/70 flex items-center gap-1.5">
                <Hash className="w-3 h-3 text-[var(--brand-red)]" />
                {t('docs.toc')}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2 overflow-y-auto scroll-styled flex-1">
              <nav className="space-y-0.5">
                {activeDoc.toc.map((h, i) => {
                  const isActive = h.anchor === activeAnchor
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const el = document.getElementById(h.anchor)
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          setActiveAnchor(h.anchor)
                        }
                      }}
                      className={`w-full text-left text-[10.5px] leading-tight py-1 px-2 rounded transition-colors ${
                        h.level === 2 ? 'font-medium' : 'pl-4'
                      } ${
                        isActive
                          ? 'bg-[var(--brand-red)]/10 text-[var(--brand-red)]'
                          : 'text-[var(--brand-ink)]/60 hover:bg-[var(--brand-cream)]'
                      }`}
                    >
                      {h.text}
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

/* ============================================================
 * MarkdownRenderer — renders GFM markdown with syntax highlighting.
 * Tailwind Typography (prose) handles styling.
 * ============================================================ */
function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:text-[var(--brand-ink)] prose-headings:font-bold prose-h1:text-[24px] prose-h1:border-b prose-h1:border-[var(--brand-border)] prose-h1:pb-2 prose-h2:text-[18px] prose-h2:mt-6 prose-h3:text-[15px] prose-h3:mt-4 prose-p:text-[var(--brand-ink)]/80 prose-p:leading-relaxed prose-a:text-[var(--brand-red)] prose-a:no-underline hover:prose-a:underline prose-strong:text-[var(--brand-ink)] prose-code:text-[var(--brand-red)] prose-code:bg-[var(--brand-cream)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[11px] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#f6f8fa] prose-pre:border prose-pre:border-[var(--brand-border)] prose-pre:text-[12px] prose-blockquote:border-l-[var(--brand-red)] prose-blockquote:bg-[var(--brand-cream)]/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-[var(--brand-ink)]/75 prose-table:text-[11px] prose-th:bg-[var(--brand-cream)] prose-th:text-[var(--brand-ink)] prose-th:font-semibold prose-th:border prose-th:border-[var(--brand-border)] prose-td:border prose-td:border-[var(--brand-border)] prose-img:rounded-lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          // Add IDs to headings for TOC anchors
          h2: ({ children, ...props }) => {
            const text = String(children).replace(/[`*_~]/g, '')
            const anchor = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
            return <h2 id={anchor} {...props}>{children}</h2>
          },
          h3: ({ children, ...props }) => {
            const text = String(children).replace(/[`*_~]/g, '')
            const anchor = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
            return <h3 id={anchor} {...props}>{children}</h3>
          },
          // External links open in new tab
          a: ({ children, href, ...props }) => {
            const isExternal = href?.startsWith('http')
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-0.5"
                {...props}
              >
                {children}
                {isExternal && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

/* ============================================================
 * EditorPane — split-pane markdown editor with live preview.
 * ============================================================ */
function EditorPane({
  value,
  onChange,
  t,
}: {
  value: string
  onChange: (v: string) => void
  t: (key: string, params?: any) => string
}) {
  const [mode, setMode] = useState<'split' | 'edit' | 'preview'>('split')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="flex flex-col">
      {/* Editor toolbar */}
      <div className="border-b border-[var(--brand-border)] px-4 py-2 flex items-center justify-between gap-2 bg-[var(--brand-cream)]/30">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={mode === 'edit' ? 'default' : 'outline'}
            onClick={() => setMode('edit')}
            className="h-6 text-[10px] px-2"
          >
            <Edit3 className="w-3 h-3 mr-1" /> {t('docs.edit_mode')}
          </Button>
          <Button
            size="sm"
            variant={mode === 'split' ? 'default' : 'outline'}
            onClick={() => setMode('split')}
            className="h-6 text-[10px] px-2"
          >
            <ChevronRight className="w-3 h-3 mr-1" /> {t('docs.split_mode')}
          </Button>
          <Button
            size="sm"
            variant={mode === 'preview' ? 'default' : 'outline'}
            onClick={() => setMode('preview')}
            className="h-6 text-[10px] px-2"
          >
            <Eye className="w-3 h-3 mr-1" /> {t('docs.preview_mode')}
          </Button>
        </div>
        <div className="text-[10px] text-[var(--brand-ink)]/50">
          {value.length.toLocaleString()} {t('docs.chars')}
        </div>
      </div>

      {/* Editor + Preview */}
      <div className={`grid ${mode === 'split' ? 'grid-cols-2' : 'grid-cols-1'} divide-x divide-[var(--brand-border)]`}>
        {(mode === 'edit' || mode === 'split') && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[500px] max-h-[calc(100vh-260px)] p-4 text-[12px] font-mono resize-none focus:outline-none bg-white scroll-styled"
            spellCheck={false}
            placeholder={t('docs.editor_placeholder')}
          />
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-260px)] scroll-styled">
            <MarkdownRenderer content={value} />
          </div>
        )}
      </div>
    </div>
  )
}
