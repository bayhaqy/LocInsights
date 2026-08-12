import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

/**
 * Middleware — protects admin-only mutation routes.
 *
 * Strategy:
 *   - GET requests to /api/locinsight/* are PUBLIC (read-only data access).
 *     The Map Explorer, Dashboard, Opportunities, etc. all rely on these.
 *   - POST/PUT/DELETE/PATCH to mutation endpoints require a superadmin session.
 *     This includes: stores, brands, malls, competitors, pois (CRUD),
 *     ab-test (save), ml/train, scrape, scrape-save, bulk.
 *
 * The login page is at /login (configured in src/lib/auth.ts → pages.signIn).
 *
 * For client-side nav protection, see src/app/page.tsx — admin-only nav items
 * (Data Manager, Scraper, Settings) are filtered out by role via useSession().
 *
 * NOTE: The matcher below is intentionally narrow — it only matches mutation
 * endpoints, NOT the entire app. This avoids accidentally wrapping public
 * pages in NextAuth's session-check flow, which would cause redirect loops
 * if NEXTAUTH_SECRET is missing or misconfigured on Vercel.
 */

const ADMIN_PATHS = [
  '/api/locinsight/stores',
  '/api/locinsight/brands',
  '/api/locinsight/malls',
  '/api/locinsight/competitors',
  '/api/locinsight/pois',
  '/api/locinsight/ab-test',
  '/api/locinsight/ml/train',
  '/api/locinsight/scrape',
  '/api/locinsight/scrape-save',
  '/api/locinsight/bulk',
  '/api/locinsight/field-survey',
]

function isAdminPath(pathname: string): boolean {
  // Match exact path OR path with a UUID-like suffix (e.g. /stores/abc-123)
  return ADMIN_PATHS.some(p =>
    pathname === p ||
    pathname.startsWith(p + '/')
  )
}

export default withAuth(
  function middleware(req) {
    // Just continue — withAuth has already verified the session exists.
    // Role check is enforced via authorized callback below.
    return NextResponse.next()
  },
  {
    callbacks: {
      // Authorized only if user has a session AND is superadmin
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        const method = req.method || 'GET'

        // GET requests are public — allow without session
        if (method === 'GET') return true

        // Non-admin paths are public
        if (!isAdminPath(pathname)) return true

        // Admin paths require superadmin role
        return token?.role === 'superadmin'
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

// Narrow matcher — ONLY match /api/locinsight/* paths, NOT the whole app.
// Public pages (/, /login, /survey, /docs, etc.) bypass middleware entirely.
export const config = {
  matcher: [
    '/api/locinsight/:path*',
  ],
}
