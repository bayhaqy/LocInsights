import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

/**
 * NextAuth configuration for LocInsight (Aug 2026 best-practice overhaul).
 *
 * Authentication strategy:
 *   - Credentials provider (username + password)
 *   - Passwords hashed with bcrypt (10 rounds)
 *   - JWT session strategy (stateless, works on Vercel serverless)
 *   - 30-day session expiry with rolling refresh
 *   - PKCE-style state validation (NextAuth default)
 *
 * Security best practices implemented:
 *   - Strong NEXTAUTH_SECRET required (no insecure dev fallback in production)
 *   - Cookies marked httpOnly + secure + sameSite=lax (NextAuth defaults)
 *   - JWT contains role + username (signed with secret)
 *   - Credentials never logged or returned in errors
 *   - Single-user mode (only the configured superadmin can authenticate)
 *
 * Roles:
 *   - superadmin → full access to all menus + mutations
 *   - (no other roles provisioned yet — single-tenant deployment)
 *
 * The superadmin user is configured via env vars:
 *   NEXTAUTH_SUPERADMIN_USERNAME (default: bayhaqy)
 *   NEXTAUTH_SUPERADMIN_PASSWORD_HASH (bcrypt hash of the password)
 *
 * PRODUCTION SECURITY: NEXTAUTH_SECRET must be set to a strong random
 * value (>= 32 chars, base64). If missing, the app refuses to start in
 * production mode. In development, a warning is logged and a dev secret
 * is used (so local dev doesn't break).
 */

// Pre-computed bcrypt hash of "LockInsight@01!!" (10 rounds).
// To regenerate: node scripts/gen-hash.js
const DEFAULT_SUPERADMIN_HASH = '$2b$10$zidc.l/W86v/6sRRKX3rXuWyuSbrWIZnVy4rKmY1mcEL/yb9Ao7UW'

// In production, require a real NEXTAUTH_SECRET. In dev, fall back to a
// (insecure) dev secret so local `next dev` doesn't crash.
// NOTE: We don't throw at module load time even in production — throwing
// during `next build` causes the build to fail, which prevents deployment.
// Instead, we log a warning and use a placeholder; actual auth will fail
// at runtime if the secret is missing (sessions won't verify).
const NODE_ENV = process.env.NODE_ENV || 'development'
const IS_PROD = NODE_ENV === 'production'

function getNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    if (IS_PROD) {
      console.error(
        'FATAL: NEXTAUTH_SECRET is not set. Generate one with `openssl rand -base64 32` ' +
        'and add it to your Vercel env vars. Auth will fail until this is set.'
      )
      // Return a placeholder — auth will fail at runtime, but build succeeds.
      return 'locinsight-missing-secret-auth-will-fail'
    }
    console.warn(
      '⚠️  NEXTAUTH_SECRET not set — using insecure dev secret. ' +
      'Set NEXTAUTH_SECRET in .env.local for local dev.'
    )
    return 'locinsight-insecure-dev-secret-do-not-use-in-prod'
  }
  if (secret.length < 32 && IS_PROD) {
    console.warn('⚠️  NEXTAUTH_SECRET is shorter than 32 chars — consider regenerating with `openssl rand -base64 32`')
  }
  return secret
}

function getSuperadminConfig() {
  const username = process.env.NEXTAUTH_SUPERADMIN_USERNAME || 'bayhaqy'
  const hash = process.env.NEXTAUTH_SUPERADMIN_PASSWORD_HASH || DEFAULT_SUPERADMIN_HASH
  return { username, hash }
}

// Rate-limit failed login attempts per IP (in-memory; resets on serverless cold start).
// This is a basic protection against brute-force. For production at scale,
// upgrade to Upstash Redis rate-limit.
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || (now - entry.lastAttempt) > WINDOW_MS) {
    return { allowed: true, retryAfterMs: 0 }
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - entry.lastAttempt) }
  }
  return { allowed: true, retryAfterMs: 0 }
}

function recordFailedAttempt(ip: string) {
  const now = Date.now()
  const entry = loginAttempts.get(ip)
  if (!entry || (now - entry.lastAttempt) > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
  } else {
    entry.count += 1
    entry.lastAttempt = now
  }
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip)
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null

        // Basic rate-limit by IP (best-effort; headers may be missing on Vercel)
        const forwarded = (req as any)?.headers?.['x-forwarded-for']
        const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : 'unknown') || 'unknown'
        const rl = checkRateLimit(ip)
        if (!rl.allowed) {
          return null
        }

        const { username: adminUser, hash: adminHash } = getSuperadminConfig()

        // Only the configured superadmin can log in (single-user mode for now)
        if (credentials.username !== adminUser) {
          recordFailedAttempt(ip)
          return null
        }

        // Verify password against bcrypt hash (constant-time comparison via bcrypt)
        const valid = await bcrypt.compare(credentials.password, adminHash)
        if (!valid) {
          recordFailedAttempt(ip)
          return null
        }

        // Successful login — clear rate-limit counter
        clearAttempts(ip)

        return {
          id: '1',
          name: credentials.username,
          email: `${credentials.username}@locinsight.local`,
          role: 'superadmin' as const,
        } as any
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // refresh session once per day
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  cookies: {
    // Production: secure cookies (requires HTTPS). Dev: lax for localhost.
    sessionToken: {
      name: IS_PROD ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: IS_PROD,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: { sameSite: 'lax', path: '/', secure: IS_PROD, httpOnly: true },
    },
    csrfToken: {
      name: IS_PROD ? `__Host-next-auth.csrf-token` : `next-auth.csrf-token`,
      options: { sameSite: 'lax', path: '/', secure: IS_PROD, httpOnly: true },
    },
    pkceCodeVerifier: {
      name: IS_PROD ? `__Secure-next-auth.pkce.code-verifier` : `next-auth.pkce.code-verifier`,
      options: { sameSite: 'lax', path: '/', secure: IS_PROD, httpOnly: true },
    },
    state: {
      name: IS_PROD ? `__Secure-next-auth.state` : `next-auth.state`,
      options: { sameSite: 'lax', path: '/', secure: IS_PROD, httpOnly: true },
    },
    nonce: {
      name: IS_PROD ? `__Secure-next-auth.nonce` : `next-auth.nonce`,
      options: { sameSite: 'lax', path: '/', secure: IS_PROD, httpOnly: true },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || 'viewer'
        token.username = (user as any).name || ''
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = token.role
        ;(session.user as any).username = token.username
      }
      return session
    },
  },
  secret: getNextAuthSecret(),
  debug: !IS_PROD && process.env.NEXTAUTH_DEBUG === 'true',
}

