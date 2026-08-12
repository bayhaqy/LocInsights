/**
 * Server-side auth helpers (Aug 2026 best-practice overhaul).
 *
 * Provides `requireSuperadmin()` and `requireAuth()` for use in any /api route
 * handler to enforce that the request comes from an authenticated user.
 *
 * Best practices implemented:
 *   - Uses `getServerSession(authOptions)` — proper server-side session
 *     verification (NOT client-side `useSession()` which can be bypassed).
 *   - Verifies BOTH authentication (session exists) AND authorization
 *     (role === 'superadmin' for requireSuperadmin).
 *   - Returns a discriminated union that TypeScript can narrow correctly
 *     when used with the standard `if (!ok) return response` pattern.
 *   - No tokens or passwords ever logged or exposed in error messages.
 *
 * Usage in a route handler:
 *
 *   import { requireSuperadmin } from '@/lib/auth-server'
 *   export async function POST(req: Request) {
 *     const auth = await requireSuperadmin()
 *     if (!auth.ok) return auth.response
 *     // ... do the mutation (auth.session is available here)
 *   }
 *
 * TypeScript narrowing: After `if (!auth.ok) return auth.response`, the type
 * of `auth` is narrowed to `{ ok: true; session: Session }`, so `auth.session`
 * is safely accessible.
 */

import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'

// Discriminated union — `ok: true` vs `ok: false` enables TypeScript narrowing.
export type AuthResult =
  | { ok: true; session: any; response?: undefined }
  | { ok: false; response: NextResponse; session?: undefined }

/**
 * Returns ok=true with the session if the request is from an authenticated
 * superadmin. Otherwise returns ok=false with a 401/403 NextResponse ready
 * to be returned by the route handler.
 */
export async function requireSuperadmin(): Promise<AuthResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }

  if ((session.user as any).role !== 'superadmin') {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Superadmin privileges required' },
        { status: 403 }
      ),
    }
  }

  return { ok: true, session }
}

/**
 * Returns ok=true with the session if the request is from any authenticated
 * user (any role). Used for read endpoints that require login but not
 * superadmin role (e.g., field surveyor submitting survey data).
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }

  return { ok: true, session }
}
