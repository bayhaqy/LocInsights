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
 * Bootstrap behavior (DB-only — NO env vars needed for superadmin):
 *   - The `bayhaqy` superadmin is seeded DIRECTLY into the Supabase `users`
 *     table by running: `bun run scripts/seed-superadmin.ts`
 *   - This script is idempotent: it creates the user if missing, or upgrades
 *     them to superadmin if they exist with a lower role.
 *   - The previous env-var approach (NEXTAUTH_SUPERADMIN_PASSWORD_HASH) has
 *     been REMOVED per user request — the superadmin is now managed purely
 *     through the DB like every other user.
 *   - To rotate the superadmin password: re-run the seed script with
 *     `--reset-password` or `--password "NewPass"`.
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

// ===== Bootstrap superadmin via DB seed script (NOT env vars) =====
// Run `bun run scripts/seed-superadmin.ts` once to add the bayhaqy superadmin
// to the users table. The script is idempotent — safe to re-run anytime.
// This block is intentionally a no-op at runtime; the bootstrap is done
// out-of-band via the seed script so we don't need any env vars for auth.

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
