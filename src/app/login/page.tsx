'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, User, Loader2, ShieldCheck, MapPin, BarChart3, Brain, Database, Globe2 } from 'lucide-react'

/**
 * Login page — split-screen layout (Aug 2026 redesign).
 *
 * Layout matches the maa-btool.bayhaqy.my.id style:
 *   - LEFT: capability showcase panel (dark wine-red gradient)
 *     with brand logo, tagline, and 5 capability highlights.
 *   - RIGHT: "Secure Sign-In" card with welcome message, username
 *     field, sign-in button, and copyright footer.
 *
 * Auth flow: signIn('credentials', { redirect: false, ... }) →
 *   on success → router.push(callbackUrl)
 *   on error → inline error message
 *
 * Wrapped in Suspense because useSearchParams() requires a Suspense
 * boundary per Next.js 14+ docs.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginInner />
    </Suspense>
  )
}

function LoginFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'radial-gradient(circle at 30% 20%, #2a0a14 0%, #0F0F12 50%, #000 100%)' }}
    >
      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  )
}

const CAPABILITIES = [
  {
    icon: MapPin,
    title: 'Hyper-Local Geospatial Intelligence',
    desc: '709+ kelurahan/desa across Bali, scored on 6 weighted factors with real OSM-admin boundaries and PostGIS-powered proximity analysis.',
  },
  {
    icon: BarChart3,
    title: 'Composite Opportunity Scoring',
    desc: 'Market size, accessibility, footfall, competition, socio-economic, and synergy factors combined into a 0–100 score with recommendation tiers.',
  },
  {
    icon: Brain,
    title: 'ML/AI Revenue Forecasting',
    desc: 'Gradient-Boosted Regression models trained on actual outlet performance — projected monthly revenue, market share, and cannibalization risk.',
  },
  {
    icon: Database,
    title: 'Unified Master Data Manager',
    desc: 'CRUD on stores, malls, brands, competitors, POIs, and administrative boundaries — with CSV/XLSX bulk import, column picker, and validation.',
  },
  {
    icon: Globe2,
    title: 'Choropleth Map Explorer',
    desc: 'Color-filled polygon visualization for Opportunity Score, Demographics, and Market Density — from Country down to Kelurahan level.',
  },
]

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        redirect: false,
        username,
        password,
        callbackUrl,
      })

      if (result?.error) {
        setError('Invalid username or password. Please try again.')
        setLoading(false)
      } else if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError('Login failed. Please try again.')
        setLoading(false)
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{
        background: 'linear-gradient(135deg, #1a060d 0%, #0F0F12 50%, #000 100%)',
      }}
    >
      {/* ===================== LEFT: Capability panel ===================== */}
      <aside
        className="hidden lg:flex flex-col justify-between p-10 xl:p-14 lg:w-[55%] xl:w-[58%] relative overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 20% 25%, rgba(122, 10, 26, 0.55) 0%, transparent 55%),' +
            'radial-gradient(circle at 80% 75%, rgba(60, 8, 16, 0.45) 0%, transparent 50%),' +
            'linear-gradient(180deg, #1a060d 0%, #0F0F12 100%)',
        }}
      >
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg">
            <img src="/logo-white.png" alt="LocInsights" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <div className="font-display text-[20px] font-bold text-white leading-tight">LocInsights</div>
            <div className="text-[10px] text-white/55 uppercase tracking-[0.18em]">Location Intelligence Platform</div>
          </div>
        </div>

        {/* Capability headline + list */}
        <div className="relative z-10 my-10">
          <h2 className="font-display text-[34px] xl:text-[42px] font-bold text-white leading-[1.1] mb-3">
            Enterprise <span style={{ color: '#E94560' }}>Location Intelligence</span>
            <br />
            for MAP Active Adiperkasa
          </h2>
          <p className="text-[14px] text-white/60 leading-relaxed max-w-[520px] mb-9">
            A production-grade decision-support platform combining PostGIS geospatial analytics,
            ML revenue forecasting, and human-curated master data — engineered to identify the
            next 100 best store locations across Bali.
          </p>

          <div className="space-y-3 max-w-[560px]">
            {CAPABILITIES.map((c, i) => {
              const Icon = c.icon
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.025] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="w-8 h-8 rounded-md bg-[var(--brand-red)]/15 border border-[var(--brand-red)]/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#E94560]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-white leading-tight">{c.title}</div>
                    <div className="text-[11.5px] text-white/55 mt-0.5 leading-snug">{c.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom stats strip */}
        <div className="relative z-10 grid grid-cols-4 gap-3 max-w-[560px]">
          {[
            { label: 'Kelurahan', value: '709+' },
            { label: 'Brands', value: '120+' },
            { label: 'Malls', value: '20+' },
            { label: 'POIs', value: '500+' },
          ].map((s, i) => (
            <div key={i} className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <div className="font-display text-[20px] font-bold text-white num-tabular leading-none">{s.value}</div>
              <div className="text-[9.5px] text-white/50 uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* ===================== RIGHT: Sign-in panel ===================== */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile brand header (hidden on lg+) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 mb-3 shadow-lg">
              <img src="/logo-white.png" alt="LocInsights" className="w-9 h-9 object-contain" />
            </div>
            <h1 className="font-display text-[22px] font-bold text-white leading-tight">LocInsights</h1>
            <p className="text-[11px] text-white/50 uppercase tracking-wider mt-1">Location Intelligence</p>
          </div>

          {/* Secure Sign-In card */}
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header strip */}
            <div className="px-7 pt-7 pb-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-[#E94560]" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/55 font-semibold">
                  Secure Sign-In
                </span>
              </div>
              <h2 className="font-display text-[24px] font-bold text-white leading-tight">Welcome</h2>
              <p className="text-[12.5px] text-white/55 mt-1 leading-relaxed">
                Sign in to your access. All platform features require authentication.
              </p>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
              <div>
                <Label htmlFor="username" className="text-[10.5px] uppercase tracking-[0.14em] text-white/55 mb-2 block font-semibold">
                  Username
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3.5 text-white/40" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="h-11 text-[13.5px] pl-10 bg-white/[0.05] border-white/15 text-white placeholder:text-white/35 focus:bg-white/[0.08] focus:border-[#E94560]/60"
                    autoComplete="username"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-[10.5px] uppercase tracking-[0.14em] text-white/55 mb-2 block font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3.5 text-white/40" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-11 text-[13.5px] pl-10 bg-white/[0.05] border-white/15 text-white placeholder:text-white/35 focus:bg-white/[0.08] focus:border-[#E94560]/60"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-[12px] rounded-md p-2.5 leading-snug flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full h-11 bg-[#E94560] hover:bg-[#d63a55] text-white text-[13.5px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    Sign In
                  </>
                )}
              </Button>

              {/* Security badges */}
              <div className="flex items-center justify-center gap-3 pt-3 text-[10px] text-white/40">
                <span className="flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> bcrypt
                </span>
                <span>·</span>
                <span>JWT 30d</span>
                <span>·</span>
                <span>Rate-limited</span>
                <span>·</span>
                <span>RBAC</span>
              </div>
            </form>
          </div>

          {/* Copyright footer */}
          <p className="text-[10.5px] text-white/40 text-center mt-6 leading-relaxed">
            © 2026 LocInsights · Built by{' '}
            <a
              href="https://bayhaqy.my.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/65 hover:text-white underline-offset-2 hover:underline"
            >
              Achmad Bayhaqy
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
