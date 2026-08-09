'use client'

/**
 * ChatWidget — floating AI chat assistant for LocInsights.
 *
 * Features:
 *   - Floating button at bottom-right (visible on ALL tabs)
 *   - Click to open chat panel
 *   - Multi-conversation CRUD (like z.ai): create, rename, delete, switch
 *   - All history persisted in localStorage
 *   - LocInsights-only guardrails enforced server-side
 *   - Quick-prompt suggestion chips
 *   - Markdown-lite rendering (bold, lists, code)
 *   - Auto-scroll to bottom on new message
 *   - Mobile-friendly (full-screen on small viewports)
 *
 * Storage schema (localStorage keys):
 *   - "locinsights.chat.conversations" → Conversation[]
 *   - "locinsights.chat.activeId"       → string (active conversation id)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageSquare, X, Send, Plus, Trash2, Edit2, Check, ChevronLeft,
  Sparkles, AlertTriangle, Loader2, MessageCircle,
} from 'lucide-react'

// ===== Types =====
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
  guardrailed?: boolean
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

// ===== Constants =====
const STORAGE_KEY_CONVS = 'locinsights.chat.conversations'
const STORAGE_KEY_ACTIVE = 'locinsights.chat.activeId'

const QUICK_PROMPTS = [
  "Apa itu LocInsights?",
  "Jelaskan scoring methodology",
  "Bagaimana cara kerja Huff Gravity?",
  "Top 5 expansion sites di Bali?",
  "Apa saja tier wilayah di Bali?",
  "Cara pakai Map Explorer?",
]

// ===== Storage helpers =====
function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveConversations(convs: Conversation[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_CONVS, JSON.stringify(convs))
  } catch (e) {
    console.warn('[chat] Failed to save conversations:', e)
  }
}

function loadActiveId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY_ACTIVE)
}

function saveActiveId(id: string | null) {
  if (typeof window === 'undefined') return
  if (id) localStorage.setItem(STORAGE_KEY_ACTIVE, id)
  else localStorage.removeItem(STORAGE_KEY_ACTIVE)
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function makeTitle(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean.length <= 40) return clean
  return clean.slice(0, 37) + '...'
}

// ===== Markdown-lite renderer =====
function renderContent(text: string): React.ReactNode {
  // Split into lines and render basic markdown: **bold**, `code`, lists, paragraphs
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let listBuffer: React.ReactNode[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (listBuffer.length === 0) return
    if (listType === 'ul') {
      out.push(<ul key={`ul-${out.length}`} className="list-disc pl-4 space-y-0.5 my-1">{listBuffer}</ul>)
    } else if (listType === 'ol') {
      out.push(<ol key={`ol-${out.length}`} className="list-decimal pl-4 space-y-0.5 my-1">{listBuffer}</ol>)
    }
    listBuffer = []
    listType = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Bullet list
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)/)
    if (bulletMatch) {
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listBuffer.push(<li key={`li-${i}`} className="text-[12.5px]">{renderInline(bulletMatch[1])}</li>)
      continue
    }

    // Numbered list
    const numMatch = trimmed.match(/^\d+\.\s+(.+)/)
    if (numMatch) {
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listBuffer.push(<li key={`li-${i}`} className="text-[12.5px]">{renderInline(numMatch[1])}</li>)
      continue
    }

    // Code block (```)
    if (trimmed.startsWith('```')) {
      flushList()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      out.push(
        <pre key={`pre-${i}`} className="bg-[var(--brand-ink)] text-white/90 text-[11.5px] rounded-md p-2.5 my-1.5 overflow-x-auto">
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      continue
    }

    // Empty line → paragraph break
    if (trimmed === '') {
      flushList()
      continue
    }

    // Regular paragraph
    flushList()
    out.push(<p key={`p-${i}`} className="text-[12.5px] leading-relaxed my-0.5">{renderInline(trimmed)}</p>)
  }
  flushList()
  return out
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold** and `code`
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let lastIdx = 0
  let match
  let key = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index))
    }
    const m = match[0]
    if (m.startsWith('**')) {
      parts.push(<strong key={key++} className="font-semibold">{m.slice(2, -2)}</strong>)
    } else if (m.startsWith('`')) {
      parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-[var(--brand-cream)] text-[var(--brand-red)] text-[11.5px] font-mono">{m.slice(1, -1)}</code>)
    }
    lastIdx = match.index + m.length
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))
  return parts
}

// ===== Main component =====
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load on mount
  useEffect(() => {
    const convs = loadConversations()
    const active = loadActiveId()
    setConversations(convs)
    if (active && convs.find(c => c.id === active)) {
      setActiveId(active)
    } else if (convs.length > 0) {
      setActiveId(convs[0].id)
    }
  }, [])

  // Persist on change
  useEffect(() => { saveConversations(conversations) }, [conversations])
  useEffect(() => { saveActiveId(activeId) }, [activeId])

  const activeConv = conversations.find(c => c.id === activeId) || null

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeConv?.messages.length, isOpen])

  // ===== CRUD: Create conversation =====
  const createConversation = useCallback(() => {
    const newConv: Conversation = {
      id: uid(),
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations(prev => [newConv, ...prev])
    setActiveId(newConv.id)
    setShowSidebar(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // ===== CRUD: Delete conversation =====
  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id)
      if (activeId === id) {
        setActiveId(next[0]?.id || null)
      }
      return next
    })
  }, [activeId])

  // ===== CRUD: Rename conversation =====
  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const commitRename = (id: string) => {
    const newTitle = editTitle.trim() || 'Untitled'
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c))
    setEditingId(null)
    setEditTitle('')
  }

  // ===== Send message =====
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return

    setError(null)
    setInput('')
    setIsSending(true)

    // Ensure there's an active conversation; if not, create one
    let convId = activeId
    let convMessages: Message[] = []

    if (!convId) {
      const newConv: Conversation = {
        id: uid(),
        title: makeTitle(trimmed),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setConversations(prev => [newConv, ...prev])
      setActiveId(newConv.id)
      convId = newConv.id
    } else {
      const existing = conversations.find(c => c.id === convId)
      convMessages = existing?.messages || []
    }

    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content: trimmed,
      ts: Date.now(),
    }

    // Optimistically add user message
    const updatedMessages = [...convMessages, userMsg]
    setConversations(prev => prev.map(c =>
      c.id === convId
        ? {
          ...c,
          messages: updatedMessages,
          title: c.messages.length === 0 ? makeTitle(trimmed) : c.title,
          updatedAt: Date.now(),
        }
        : c
    ))

    try {
      // Build messages payload for API
      const apiMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/locinsight/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })
      const j = await res.json()

      if (!j.success) throw new Error(j.error || 'Failed to get response')

      const aiMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: j.data.content,
        ts: Date.now(),
        guardrailed: j.data.guardrailed,
      }

      setConversations(prev => prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, aiMsg], updatedAt: Date.now() }
          : c
      ))
    } catch (e: any) {
      setError(e.message || 'Failed to send message')
      // Add error message to conversation
      const errMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: `Maaf, terjadi error: ${e.message || 'unknown error'}. Coba lagi.`,
        ts: Date.now(),
      }
      setConversations(prev => prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, errMsg], updatedAt: Date.now() }
          : c
      ))
    } finally {
      setIsSending(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [activeId, conversations, isSending])

  // ===== Handle Enter to send (Shift+Enter for newline) =====
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // ===== Render =====
  return (
    <>
      {/* Floating button — visible when chat is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-[200] w-14 h-14 rounded-full bg-[var(--brand-red)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
          aria-label="Open LocInsights AI chat"
          title="LocInsights AI"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-[var(--brand-red)] opacity-40 animate-ping" />
          <MessageSquare className="w-6 h-6 relative" />
          {/* Online dot */}
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-5 sm:right-5 z-[200] w-full sm:w-[420px] h-full sm:h-[640px] sm:max-h-[calc(100vh-40px)] bg-white sm:rounded-xl shadow-2xl border border-[var(--brand-border)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[var(--brand-ink)] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowSidebar(s => !s)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                aria-label="Toggle conversation list"
                title="History"
              >
                {showSidebar ? <ChevronLeft className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
              </button>
              <div className="w-7 h-7 rounded-full bg-[var(--brand-red)] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[13px] font-semibold leading-tight">LocInsights AI</div>
                <div className="text-[10px] text-white/60 leading-tight">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1" />
                  Online · Scoped to LocInsights
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={createConversation}
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                aria-label="New conversation"
                title="New chat"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setIsOpen(false); setShowSidebar(false) }}
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
                aria-label="Close chat"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body: sidebar + messages */}
          <div className="flex-1 flex overflow-hidden">
            {/* Conversation sidebar */}
            {showSidebar && (
              <div className="w-[180px] border-r border-[var(--brand-border)] bg-[var(--brand-cream)]/50 overflow-y-auto flex-shrink-0 scroll-styled">
                <div className="p-2">
                  <button
                    onClick={createConversation}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md bg-[var(--brand-red)] text-white text-[12px] font-medium hover:bg-[var(--brand-red)]/90 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New chat
                  </button>
                </div>
                <div className="px-2 pb-2">
                  <div className="text-[9.5px] uppercase tracking-wider text-[var(--brand-ink)]/40 px-1 mb-1 mt-2">
                    History ({conversations.length})
                  </div>
                  {conversations.length === 0 && (
                    <div className="text-[11px] text-[var(--brand-ink)]/40 px-1 py-2">No conversations yet</div>
                  )}
                  {conversations.map(c => (
                    <div
                      key={c.id}
                      className={`group relative px-2 py-1.5 rounded-md text-[11.5px] cursor-pointer mb-0.5 transition-colors ${
                        c.id === activeId
                          ? 'bg-white border border-[var(--brand-border)] text-[var(--brand-ink)] font-medium'
                          : 'hover:bg-white/60 text-[var(--brand-ink)]/70'
                      }`}
                      onClick={() => { setActiveId(c.id); setShowSidebar(false) }}
                    >
                      {editingId === c.id ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <input
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitRename(c.id); if (e.key === 'Escape') setEditingId(null) }}
                            className="flex-1 text-[11px] px-1 py-0.5 border border-[var(--brand-red)] rounded outline-none min-w-0"
                            autoFocus
                          />
                          <button onClick={() => commitRename(c.id)} className="text-green-600">
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="truncate pr-10">{c.title}</div>
                          <div className="text-[9px] text-[var(--brand-ink)]/40 mt-0.5">
                            {new Date(c.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · {c.messages.length} msg
                          </div>
                          <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); startRename(c.id, c.title) }}
                              className="p-1 rounded hover:bg-[var(--brand-cream)] text-[var(--brand-ink)]/60 hover:text-[var(--brand-ink)]"
                              title="Rename"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Delete "${c.title}"? This cannot be undone.`)) deleteConversation(c.id)
                              }}
                              className="p-1 rounded hover:bg-red-50 text-[var(--brand-ink)]/60 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 space-y-3 scroll-styled bg-white"
              >
                {(!activeConv || activeConv.messages.length === 0) && (
                  <div className="text-center py-6 px-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-[var(--brand-red)]/10 flex items-center justify-center mb-3">
                      <Sparkles className="w-6 h-6 text-[var(--brand-red)]" />
                    </div>
                    <div className="text-[14px] font-semibold text-[var(--brand-ink)] mb-1">
                      LocInsights AI
                    </div>
                    <div className="text-[11.5px] text-[var(--brand-ink)]/60 mb-4 leading-relaxed max-w-[280px] mx-auto">
                      Tanyakan apa saja tentang LocInsights — scoring, peta, kompetitor, demografi, atau cara pakai platform ini.
                    </div>
                    <div className="space-y-1.5">
                      {QUICK_PROMPTS.map(q => (
                        <button
                          key={q}
                          onClick={() => sendMessage(q)}
                          className="block w-full text-left px-3 py-2 rounded-md border border-[var(--brand-border)] text-[11.5px] text-[var(--brand-ink)]/70 hover:border-[var(--brand-red)] hover:bg-[var(--brand-cream)]/50 hover:text-[var(--brand-ink)] transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeConv?.messages.map(m => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${m.role === 'user' ? 'order-2' : ''}`}>
                      {m.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-4 h-4 rounded-full bg-[var(--brand-red)] flex items-center justify-center">
                            <Sparkles className="w-2.5 h-2.5 text-white" />
                          </div>
                          <span className="text-[9.5px] uppercase tracking-wider text-[var(--brand-ink)]/50 font-medium">
                            LocInsights AI
                            {m.guardrailed && (
                              <span className="ml-1.5 text-amber-600 inline-flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5" /> out-of-scope
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      <div
                        className={`px-3 py-2 rounded-lg text-[12.5px] leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-[var(--brand-red)] text-white rounded-br-sm'
                            : 'bg-[var(--brand-cream)] text-[var(--brand-ink)] rounded-bl-sm border border-[var(--brand-border)]'
                        }`}
                      >
                        {m.role === 'assistant' ? renderContent(m.content) : m.content}
                      </div>
                      <div className={`text-[9px] text-[var(--brand-ink)]/40 mt-0.5 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {new Date(m.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-4 h-4 rounded-full bg-[var(--brand-red)] flex items-center justify-center">
                          <Sparkles className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-[9.5px] uppercase tracking-wider text-[var(--brand-ink)]/50 font-medium">LocInsights AI</span>
                      </div>
                      <div className="px-3 py-2.5 rounded-lg bg-[var(--brand-cream)] border border-[var(--brand-border)] rounded-bl-sm">
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin text-[var(--brand-red)]" />
                          <span className="text-[11.5px] text-[var(--brand-ink)]/60">Menyusun jawaban...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex justify-center">
                    <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" />
                      {error}
                    </div>
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="border-t border-[var(--brand-border)] p-2.5 bg-white">
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tanya LocInsights AI..."
                    rows={1}
                    className="w-full text-[12.5px] resize-none border border-[var(--brand-border)] rounded-lg pl-3 pr-10 py-2.5 outline-none focus:border-[var(--brand-red)] focus:ring-1 focus:ring-[var(--brand-red)]/30 max-h-[120px] min-h-[40px] overflow-y-auto scroll-styled"
                    style={{ height: 'auto' }}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement
                      t.style.height = 'auto'
                      t.style.height = Math.min(t.scrollHeight, 120) + 'px'
                    }}
                    disabled={isSending}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isSending}
                    className="absolute right-1.5 bottom-1.5 w-7 h-7 rounded-md bg-[var(--brand-red)] text-white flex items-center justify-center hover:bg-[var(--brand-red)]/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send message"
                  >
                    {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-[9px] text-[var(--brand-ink)]/40 mt-1 text-center">
                  LocInsights AI hanya menjawab seputar LocInsights · Enter untuk kirim, Shift+Enter untuk baris baru
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
