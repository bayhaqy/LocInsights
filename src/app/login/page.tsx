'use client'

/**
 * LocInsights — Login Page (/login)
 *
 * Split-screen layout:
 *   Left: Marketing showcase (LocInsights value proposition)
 *   Right: Login form (username + password)
 *
 * On success → redirect to /dashboard (or ?callbackUrl=)
 * On failure → inline error message
 *
 * NOTE: This component is wrapped in <Suspense> by the default export below,
 * because useSearchParams() requires a Suspense boundary during static prerender.
 */

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, MapPin, TrendingUp, Building2, Brain } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--brand-cream)]">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-red)]" />
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid username or password. Please try again.')
        setLoading(false)
        return
      }

      if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError('Login failed unexpectedly. Please try again.')
        setLoading(false)
      }
    } catch (e: any) {
      setError(e.message || 'Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--brand-cream)]">
      {/* === LEFT: Marketing showcase === */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--brand-ink)] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, #C8102E 1px, transparent 1px), radial-gradient(circle at 75% 75%, #7A0A1A 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <img src="/logo-white.png" alt="LocInsights" className="w-10 h-10 object-contain" />
            <div>
              <div className="text-2xl font-bold tracking-tight">LocInsights</div>
              <div className="text-xs text-white/60">Location Intelligence for Retail Expansion</div>
            </div>
          </div>

          <h1 className="text-4xl font-bold leading-tight mb-4">
            Find your next <span className="text-[var(--brand-red)]">high-potential</span> store location.
          </h1>
          <p className="text-white/70 text-lg mb-10 leading-relaxed">
            Enterprise-grade location intelligence platform combining government data,
            live web data, and ML-driven scoring — calibrated to your portfolio and competitive landscape.
          </p>

          {/* Feature highlights */}
          <div className="space-y-5">
            <Feature
              icon={<MapPin className="w-5 h-5" />}
              title="Interactive Map Explorer"
              desc="Choropleth + point layers across 5 region levels (kelurahan → country)"
            />
            <Feature
              icon={<TrendingUp className="w-5 h-5" />}
              title="Opportunity Finder"
              desc="Composite ML scoring across 10 weighted factors per kelurahan"
            />
            <Feature
              icon={<Building2 className="w-5 h-5" />}
              title="Mall Network & Competitor Intel"
              desc="Live tenant audits + 27+ tracked competitor brands scraped from OSM"
            />
            <Feature
              icon={<Brain className="w-5 h-5" />}
              title="ML/AI Engine"
              desc="Pure-TypeScript Gradient Boosted Regressor for revenue forecasting"
            />
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40 pt-8 border-t border-white/10">
          © {new Date().getFullYear()} LocInsights · Built by{' '}
          <a href="https://bayhaqy.my.id" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white underline-offset-2 hover:underline">
            Achmad Bayhaqy
          </a>
        </div>
      </div>

      {/* === RIGHT: Login form === */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src="/logo.png" alt="LocInsights" className="w-10 h-10 object-contain" />
            <div className="text-2xl font-bold text-[var(--brand-ink)]">LocInsights</div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-2">Welcome back</h2>
            <p className="text-sm text-[var(--brand-ink)]/60">
              Sign in to access your location intelligence dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. admin_map"
                autoComplete="username"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-[var(--brand-red)] hover:bg-[var(--brand-ink)] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-8 p-4 rounded-md bg-white/60 border border-[var(--brand-border)] text-xs text-[var(--brand-ink)]/70">
            <div className="font-medium mb-2 text-[var(--brand-ink)]">Demo accounts:</div>
            <ul className="space-y-1 font-mono">
              <li><span className="text-[var(--brand-red)]">admin_map</span> / admin_map — All features except Users Management</li>
              <li><span className="text-[var(--brand-red)]">data_map</span> / data_map — Full control on Reports, Data, Scraper</li>
              <li><span className="text-[var(--brand-red)]">demo_map</span> / demo_map — Read-only viewer</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// Feature component
// =====================================================
function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--brand-red)]/20 flex items-center justify-center text-[var(--brand-red)]">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-white mb-0.5">{title}</div>
        <div className="text-sm text-white/60 leading-snug">{desc}</div>
      </div>
    </div>
  )
}
