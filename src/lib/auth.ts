import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

/**
 * NextAuth configuration for LocInsight.
 *
 * Authentication strategy:
 *   - Credentials provider (username + password)
 *   - Passwords hashed with bcrypt (10 rounds)
 *   - JWT session strategy (stateless, works on Vercel serverless)
 *   - 30-day session expiry
 *
 * Roles:
 *   - superadmin → full access to all menus (Data Manager, Scraper, Settings, ML Train, etc.)
 *   - analyst    → read-only access to dashboards + analysis
 *   - viewer     → read-only access, no CSV export
 *
 * The superadmin user is configured via env vars:
 *   NEXTAUTH_SUPERADMIN_USERNAME (default: bayhaqy)
 *   NEXTAUTH_SUPERADMIN_PASSWORD_HASH (bcrypt hash of the password)
 *
 * For initial setup, a hash of "LockInsight@01!!" is hardcoded as fallback
 * so the user can log in immediately without running a separate seed script.
 * On first deployment, the operator should set NEXTAUTH_SUPERADMIN_PASSWORD_HASH
 * env var to override this with their own bcrypt hash.
 */

// Pre-computed bcrypt hash of "LockInsight@01!!" (10 rounds).
// To regenerate: node scripts/gen-hash.js
const DEFAULT_SUPERADMIN_HASH = '$2b$10$zidc.l/W86v/6sRRKX3rXuWyuSbrWIZnVy4rKmY1mcEL/yb9Ao7UW'

function getSuperadminConfig() {
  const username = process.env.NEXTAUTH_SUPERADMIN_USERNAME || 'bayhaqy'
  const hash = process.env.NEXTAUTH_SUPERADMIN_PASSWORD_HASH || DEFAULT_SUPERADMIN_HASH
  return { username, hash }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const { username: adminUser, hash: adminHash } = getSuperadminConfig()

        // Only the configured superadmin can log in (single-user mode for now)
        if (credentials.username !== adminUser) return null

        // Verify password against bcrypt hash
        const valid = await bcrypt.compare(credentials.password, adminHash)
        if (!valid) return null

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
  },
  pages: {
    signIn: '/login',
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
  secret: process.env.NEXTAUTH_SECRET || 'locinsight-dev-secret-change-in-production',
}
