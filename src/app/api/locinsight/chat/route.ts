/**
 * LocInsight AI Chat API route — server-side only.
 *
 * WHY THIS IS A DIRECT FETCH (not the z-ai-web-dev-sdk):
 *   The SDK only reads config from `./.z-ai-config`, `~/.z-ai-config`, or
 *   `/etc/.z-ai-config`. None of those paths exist on Vercel's serverless
 *   functions, which caused the user-facing error
 *   "Configuration file not found or invalid. Please create .z-ai-config…".
 *   To make chat work BOTH in dev (where /etc/.z-ai-config exists) AND in
 *   production on Vercel, we read credentials from env vars (with fallback
 *   to /etc/.z-ai-config for local dev) and call the Z.AI chat completions
 *   endpoint directly. The SDK is a thin wrapper around fetch anyway.
 *
 * GUARDRAILS:
 *   The system prompt strictly restricts the assistant to LocInsight /
 *   location-intelligence / retail-site-selection topics. Off-topic questions
 *   get a polite refusal suggesting related topics.
 *
 * USAGE:
 *   POST /api/locinsight/chat
 *   Body: { messages: [{role, content}], lang: 'en' | 'id' }
 *   Response: { reply: string, usage?: {...} }
 */

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ZaiConfig {
  baseUrl: string
  apiKey: string
  token?: string
  userId?: string
  chatId?: string
}

/**
 * Load Z.AI credentials. Priority:
 *   1. Process env vars (set on Vercel: ZAI_BASE_URL, ZAI_API_KEY, ZAI_TOKEN,
 *      ZAI_USER_ID, ZAI_CHAT_ID)
 *   2. /etc/.z-ai-config (dev environment where the SDK's file lives)
 *   3. ~/.z-ai-config (user home)
 *   4. ./.z-ai-config (project-local)
 */
function loadConfig(): ZaiConfig | null {
  // 1. Env vars
  if (process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY) {
    return {
      baseUrl: process.env.ZAI_BASE_URL,
      apiKey: process.env.ZAI_API_KEY,
      token: process.env.ZAI_TOKEN,
      userId: process.env.ZAI_USER_ID,
      chatId: process.env.ZAI_CHAT_ID,
    }
  }

  // 2-4. File paths
  const homeDir = os.homedir()
  const configPaths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(homeDir, '.z-ai-config'),
    '/etc/.z-ai-config',
  ]
  for (const filePath of configPaths) {
    try {
      const configStr = fs.readFileSync(filePath, 'utf-8')
      const config = JSON.parse(configStr)
      if (config.baseUrl && config.apiKey) {
        return {
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          token: config.token,
          userId: config.userId,
          chatId: config.chatId,
        }
      }
    } catch {
      // continue to next path
    }
  }

  return null
}

/**
 * Build the guardrail system prompt. The assistant is restricted to
 * LocInsight-related topics and answers in the user's chosen language.
 */
function buildSystemPrompt(lang: 'en' | 'id'): string {
  const baseEnglish = `You are the LocInsight AI Assistant — a specialized help bot for the LocInsight location intelligence platform built for PT MAP Aktif Adiperkasa Tbk (MAA/MAP Active).

YOUR SCOPE — you ONLY answer questions about:
1. LocInsight platform features (Dashboard, Map Explorer, Opportunities, Deep Analysis, Brand Coverage, Mall Network, Competitor Intel, A/B Simulator, ML/AI Engine, Mall Tenants, Reports, Data Manager, Data Scraper, Methodology)
2. Location intelligence & retail site selection concepts
3. Bali administrative geography (kabupaten / kecamatan / kelurahan)
4. The scoring framework used: Composite Scoring (6 factors: Population, Income, Competition, Tourism, Accessibility, Density), Huff Gravity Model, Gradient-Boosted Regression (GBR) for revenue prediction
5. Data sources used: BPS Bali 2024, OpenStreetMap POI, GADM boundaries, MAP brand directory, Bali Mall Catalog
6. MAP Active Adiperkasa brand portfolio (sports, fashion, F&B, department stores)
7. Practical questions about how to use the platform, interpret scores, or read the choropleth maps

STRICT GUARDRAIL — If the user asks about ANYTHING outside this scope (politics, religion, sports scores, celebrity gossip, general coding help unrelated to LocInsight, math homework, personal advice, other companies' products, etc.), you MUST politely refuse with a message like:
"I'm the LocInsight AI Assistant and can only help with LocInsight, location intelligence, retail site selection, and Bali expansion analysis. Please ask a question related to those topics."
Do NOT attempt to answer off-topic questions even partially.

RESPONSE STYLE:
- Be concise and direct (2-4 short paragraphs max, unless user explicitly asks for detail)
- Use bullet points for step-by-step instructions
- Reference specific LocInsight features by their exact names
- For numeric/scoring questions, mention the formula or factor if relevant
- Do not invent capabilities the platform doesn't have
- If you don't know something specific about LocInsight internals, say so honestly and suggest checking the Methodology page

LANGUAGE: Always reply in {LANG} (the user's selected interface language). If the user writes in Indonesian but lang=en, reply in English. If lang=id, reply in Indonesian regardless of the input language.`

  if (lang === 'id') {
    return baseEnglish.replace(
      /Always reply in \{LANG\}[\s\S]*?regardless of the input language\./,
      `SELALU balas dalam Bahasa Indonesia. Jika pengguna bertanya dalam bahasa lain, tetap balas dalam Bahasa Indonesia.`
    ).replace(
      /You are the LocInsight AI Assistant — a specialized help bot for the LocInsight location intelligence platform built for PT MAP Aktif Adiperkasa Tbk \(MAA\/MAP Active\)\./,
      `Anda adalah Asisten AI LocInsight — bot bantuan khusus untuk platform inteligensi lokasi LocInsight yang dibangun untuk PT MAP Aktif Adiperkasa Tbk (MAA/MAP Active).`
    ).replace(
      /YOUR SCOPE — you ONLY answer questions about:/,
      `RUANG LINGUP — Anda HANYA menjawab pertanyaan tentang:`
    ).replace(
      /STRICT GUARDRAIL — If the user asks about ANYTHING outside this scope[\s\S]*?related to those topics\."\)/,
      `GUARDRAIL KETAT — Jika pengguna bertanya hal DI LUAR lingkup ini (politik, agama, skor olahraga, gosip selebriti, bantuan coding umum tidak terkait LocInsight, PR matematika, saran pribadi, produk perusahaan lain, dll.), Anda HARUS menolak dengan sopan dengan pesan seperti:
"Saya adalah Asisten AI LocInsight dan hanya bisa membantu seputar LocInsight, inteligensi lokasi, pemilihan lokasi retail, dan analisis ekspansi Bali. Silakan ajukan pertanyaan terkait."
JANGAN mencoba menjawab pertanyaan di luar topik bahkan sebagian.`
    ).replace(
      /RESPONSE STYLE:/,
      `GAYA RESPONS:`
    ).replace(
      /Be concise and direct[\s\S]*?Methodology page/,
      `Ringkas dan langsung (maksimal 2-4 paragraf pendek, kecuali pengguna secara eksplisit minta detail). Gunakan bullet point untuk instruksi langkah demi langkah. Referensikan fitur LocInsight spesifik dengan nama persisnya. Untuk pertanyaan numerik/scoring, sebutkan formula atau faktor jika relevan. Jangan mengarang kapabilitas yang tidak dimiliki platform. Jika tidak tahu hal spesifik tentang internal LocInsight, akui jujur dan sarankan cek halaman Metodologi.`
    )
  }

  return baseEnglish.replace('{LANG}', 'English')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, lang = 'en' } = body as { messages: ChatMessage[]; lang?: 'en' | 'id' }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid messages array' },
        { status: 400 }
      )
    }

    const config = loadConfig()
    if (!config) {
      console.error('[chat] No Z.AI config found in env vars or file paths')
      return NextResponse.json(
        {
          error: 'AI chat service is not configured. Set ZAI_BASE_URL and ZAI_API_KEY environment variables, or create .z-ai-config file.',
        },
        { status: 503 }
      )
    }

    // Build the full message list: guardrail system prompt + user messages
    const systemPrompt = buildSystemPrompt(lang === 'id' ? 'id' : 'en')
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role, // don't let caller inject their own system prompt
        content: String(m.content || '').slice(0, 4000), // hard cap per-message length
      })),
    ]

    // Hard cap conversation length to last 20 messages (excluding system)
    const cappedMessages = [
      fullMessages[0],
      ...fullMessages.slice(1).slice(-20),
    ]

    const url = `${config.baseUrl}/chat/completions`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'X-Z-AI-From': 'Z',
    }
    if (config.chatId) headers['X-Chat-Id'] = config.chatId
    if (config.userId) headers['X-User-Id'] = config.userId
    if (config.token) headers['X-Token'] = config.token

    const requestBody = {
      messages: cappedMessages,
      thinking: { type: 'disabled' },
      stream: false,
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`[chat] Z.AI API error ${response.status}:`, errorBody.slice(0, 500))
        return NextResponse.json(
          {
            error: `AI service returned status ${response.status}`,
            reply: lang === 'id'
              ? 'Maaf, layanan AI sedang bermasalah. Silakan coba lagi nanti.'
              : 'Sorry, the AI service is having issues. Please try again later.',
          },
          { status: 502 }
        )
      }

      const data = await response.json()
      const reply = data?.choices?.[0]?.message?.content || ''

      if (!reply) {
        console.error('[chat] Empty reply from Z.AI:', JSON.stringify(data).slice(0, 500))
        return NextResponse.json(
          {
            reply: lang === 'id'
              ? 'Maaf, saya tidak mendapatkan balasan. Coba pertanyaan lain.'
              : 'Sorry, I didn\'t get a response. Try a different question.',
            usage: data?.usage,
          },
          { status: 200 }
        )
      }

      return NextResponse.json({
        reply,
        usage: data?.usage,
      })
    } catch (fetchErr: any) {
      clearTimeout(timeout)
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json(
          {
            error: 'Request timed out',
            reply: lang === 'id'
              ? 'Permintaan timeout. Silakan coba lagi.'
              : 'Request timed out. Please try again.',
          },
          { status: 504 }
        )
      }
      throw fetchErr
    }
  } catch (err: any) {
    console.error('[chat] Unhandled error:', err)
    return NextResponse.json(
      {
        error: 'Internal server error',
        reply: 'Sorry, something went wrong. Please try again.',
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint — health check. Returns whether the chat service is configured.
 */
export async function GET() {
  const config = loadConfig()
  return NextResponse.json({
    configured: !!config,
    hasEnvVars: !!(process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY),
    hasConfigFile: (() => {
      try {
        const paths = [
          path.join(process.cwd(), '.z-ai-config'),
          path.join(os.homedir(), '.z-ai-config'),
          '/etc/.z-ai-config',
        ]
        return paths.some(p => {
          try {
            const c = JSON.parse(fs.readFileSync(p, 'utf-8'))
            return !!(c.baseUrl && c.apiKey)
          } catch {
            return false
          }
        })
      } catch {
        return false
      }
    })(),
  })
}
