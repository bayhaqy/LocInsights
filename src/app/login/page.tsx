'use client'

/**
 * LocInsights — Login Page (/login)
 *
 * Original dark-gradient design (restored per user request, Aug 14 2026).
 *
 * Visual: radial-gradient background (wine→ink→black), centered white card
 * with logo header, username + password fields with icons, "Sign In" button.
 *
 * On success → redirect to callbackUrl (default /dashboard).
 * If already logged in, middleware will redirect away from /login before
 * this page renders.
 */

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, User, Loader2, ShieldCheck } from 'lucide-react'

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

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/dashboard'

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
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(circle at 30% 20%, #2a0a14 0%, #0F0F12 50%, #000 100%)',
      }}
    >
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 mb-3 shadow-lg">
            <img src="/logo-white.png" alt="LocInsights" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="font-display text-[22px] font-bold text-white leading-tight">LocInsights</h1>
          <p className="text-[12px] text-white/50 uppercase tracking-wider mt-1">Location Intelligence</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-md border-white/20 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-[16px] flex items-center gap-2 text-[var(--brand-ink)]">
              <ShieldCheck className="w-4 h-4 text-[var(--brand-red)]" />
              Sign In
            </CardTitle>
            <p className="text-[11.5px] text-[var(--brand-ink)]/60 mt-1 leading-relaxed">
              Sign in to access your location intelligence dashboard. Use your
              assigned username and password.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label
                  htmlFor="username"
                  className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block"
                >
                  Username
                </Label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--brand-ink)]/40" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="h-10 text-[13px] pl-9"
                    autoComplete="username"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="password"
                  className="text-[11px] uppercase tracking-wider text-[var(--brand-ink)]/60 mb-1.5 block"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--brand-ink)]/40" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="h-10 text-[13px] pl-9"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-[11.5px] rounded-md p-2.5 leading-snug">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full h-10 bg-[var(--brand-red)] hover:bg-[var(--brand-red-dark)] text-white text-[13px] font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {/* Demo credentials hint */}
            <div className="mt-4 pt-3 border-t border-[var(--brand-border)]">
              <details className="group">
                <summary className="text-[11px] text-[var(--brand-ink)]/50 cursor-pointer hover:text-[var(--brand-red)] transition-colors select-none">
                  Demo accounts (click to expand)
                </summary>
                <ul className="mt-2 space-y-0.5 text-[10.5px] font-mono text-[var(--brand-ink)]/60">
                  <li>
                    <span className="text-[var(--brand-red)]">admin_map</span> / admin_map — All features except Users
                    Management
                  </li>
                  <li>
                    <span className="text-[var(--brand-red)]">data_map</span> / data_map — Full control on Reports, Data,
                    Scraper
                  </li>
                  <li>
                    <span className="text-[var(--brand-red)]">demo_map</span> / demo_map — Read-only viewer
                  </li>
                </ul>
              </details>
            </div>

            <div className="mt-3 pt-2 border-t border-[var(--brand-border)] text-center">
              <a
                href="/"
                className="text-[11px] text-[var(--brand-ink)]/60 hover:text-[var(--brand-red)] transition-colors"
              >
                ← Back to landing page
              </a>
            </div>
          </CardContent>
        </Card>

        <p className="text-[10.5px] text-white/40 text-center mt-4 leading-relaxed">
          Protected by NextAuth · bcrypt-hashed credentials · 30-day JWT session
          <br />
          © {new Date().getFullYear()} LocInsights · Built by{' '}
          <a
            href="https://bayhaqy.my.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white underline-offset-2 hover:underline"
          >
            Achmad Bayhaqy
          </a>
        </p>
      </div>
    </div>
  )
}
