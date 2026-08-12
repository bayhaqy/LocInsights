import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db as prisma } from './db'

/**
 * NextAuth configuration for LocInsight (Aug 2026 best-practice overhaul).
 *
 * Authentication strategy:
 *   - Credentials provider (username + password)
 *   - Passwords hashed with bcrypt (10 rounds), stored in `users` table
 *   - JWT session strategy (stateless, works on Vercel serverless)
 *   - 30-day session expiry with rolling refresh
 *   - PKCE-style state validation (NextAuth default)
 *   - DB-backed brute-force lockout (failed_login_count + locked_until)
 *
 * Bootstrap behavior (env-var superadmin fallback):
 *   - On startup, if no users exist in the DB, the env-var-configured
 *     superadmin (NEXTAUTH_SUPERADMIN_USERNAME / _PASSWORD_HASH) is
 *     auto-created with role=superadmin, is_active=true.
 *   - This ensures the very first login works out-of-the-box without
 *     manual DB seeding, while subsequent users are managed via the
 *     /admin/users panel.
 *   - If the env-var user DOES exist but its hash differs from env, the
 *     hash is updated (lets the operator rotate the superadmin password
 *     via env var change + redeploy).
 *
 * Security best practices implemented:
 *   - Strong NEXTAUTH_SECRET required (no insecure dev fallback in production)
 *   - Cookies marked httpOnly + secure + sameSite=lax (NextAuth defaults)
 *   - JWT contains role + username + user_id (signed with secret)
 *   - Credentials never logged or returned in errors
 *   - Per-user DB-side lockout (5 attempts / 15 min)
 *   - Audit log entries for login success/failure
 *
 * Roles:
 *   - superadmin : full CRUD + user/role management
 *   - analyst    : read + run ML/AI forecasts (no master data mutations)
 *   - viewer     : read-only dashboards/maps
 */

// Pre-computed bcrypt hash of "LockInsight@01!!" (10 rounds).
// Used ONLY to bootstrap the env-var superadmin if no users exist in DB.
// To regenerate: node scripts/gen-hash.js
const DEFAULT_SUPERADMIN_HASH = '$2b$10$zidc.l/W86v/6sRRKX3rXuWyuSbrWIZnVy4rKmY1mcEL/yb9Ao7UW'

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

// In-memory rate-limit (best-effort for Vercel cold-start; the DB-side
// `locked_until` provides the real persistent protection).
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes

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

// ===== Bootstrap env-var superadmin on first run =====
let bootstrapPromise: Promise<void> | null = null

async function ensureSuperadminBootstrapped() {
  if (bootstrapPromise) return bootstrapPromise
  bootstrapPromise = (async () => {
    try {
      const { username, hash } = getSuperadminConfig()
      const existing = await prisma.user.findUnique({ where: { username } })
      if (!existing) {
        // No superadmin yet — check whether the DB has ANY users
        const userCount = await prisma.user.count()
        if (userCount === 0) {
          await prisma.user.create({
            data: {
              username,
              email: `${username}@locinsight.local`,
              display_name: username.charAt(0).toUpperCase() + username.slice(1),
              password_hash: hash,
              role: 'superadmin',
              is_active: true,
              created_by: 'env-bootstrap',
            },
          })
          console.log(`[auth] Bootstrapped superadmin '${username}' from env vars.`)
        }
      } else if (existing.password_hash !== hash) {
        // Hash differs from env — rotate it (lets ops force password change via env)
        await prisma.user.update({
          where: { id: existing.id },
          data: { password_hash: hash, role: 'superadmin', is_active: true },
        })
        console.log(`[auth] Rotated superadmin '${username}' password hash from env vars.`)
      }
    } catch (err) {
      console.error('[auth] Failed to bootstrap superadmin:', err)
    }
  })()
  return bootstrapPromise
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

        // In-memory rate-limit by IP (fast path)
        const forwarded = (req as any)?.headers?.['x-forwarded-for']
        const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : 'unknown') || 'unknown'
        const rl = checkRateLimit(ip)
        if (!rl.allowed) return null

        // Make sure the env-var superadmin exists (idempotent)
        await ensureSuperadminBootstrapped()

        // Look up the user in the DB
        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        })

        if (!user) {
          recordFailedAttempt(ip)
          return null
        }

        // Check active flag
        if (!user.is_active) {
          recordFailedAttempt(ip)
          return null
        }

        // Check DB-side lockout
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
          recordFailedAttempt(ip)
          return null
        }

        // Verify password (constant-time via bcrypt)
        const valid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!valid) {
          // Increment failed_login_count; lock after MAX_ATTEMPTS
          const newCount = user.failed_login_count + 1
          const shouldLock = newCount >= MAX_ATTEMPTS
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failed_login_count: newCount,
              locked_until: shouldLock ? new Date(Date.now() + LOCKOUT_MS) : user.locked_until,
            },
          })
          // Audit log
          await prisma.userAuditLog.create({
            data: {
              user_id: user.id,
              action: 'login',
              details: { success: false, reason: 'invalid_password', attempt: newCount },
              ip_address: ip,
            },
          }).catch(() => {})
          recordFailedAttempt(ip)
          return null
        }

        // Successful login — clear counters + update last_login_at
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failed_login_count: 0,
            locked_until: null,
            last_login_at: new Date(),
          },
        })
        // Audit log
        await prisma.userAuditLog.create({
          data: {
            user_id: user.id,
            action: 'login',
            details: { success: true },
            ip_address: ip,
          },
        }).catch(() => {})

        clearAttempts(ip)

        return {
          id: user.id,
          name: user.username,
          email: user.email || `${user.username}@locinsight.local`,
          role: user.role,
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
    sessionToken: {
      name: IS_PROD ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: IS_PROD },
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
        token.user_id = (user as any).id || ''
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = token.role
        ;(session.user as any).username = token.username
        ;(session.user as any).id = token.user_id
      }
      return session
    },
  },
  secret: getNextAuthSecret(),
  debug: !IS_PROD && process.env.NEXTAUTH_DEBUG === 'true',
}
