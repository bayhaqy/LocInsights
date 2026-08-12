// Middleware intentionally DISABLED.
//
// The NextAuth `withAuth` middleware was causing Configuration errors on Vercel
// when wrapping /api/locinsight/* routes (likely due to NEXTAUTH_SECRET not
// being set in the Vercel env, which causes JWT verification to fail even
// though we have a fallback in auth.ts).
//
// Route protection strategy instead:
//   1. Client-side: NAV_ITEMS filtered by useSession() in page.tsx —
//      admin-only menus (Data Manager, Scraper, Settings) are hidden from
//      non-authenticated users.
//   2. Server-side: each admin API route should call getServerSession() and
//      verify role === 'superadmin' before performing mutations.
//      TODO: Add session checks to /api/locinsight/stores, brands, malls,
//      competitors, pois, ab-test, ml/train, scrape, scrape-save, bulk routes.
//
// Public read access (GET) to /api/locinsight/* remains unrestricted — this
// is required for the public dashboards (Map Explorer, Opportunities, etc.).
//
// The login page (/login) and NextAuth routes (/api/auth/*) work normally.

// Empty middleware — no-op
export function middleware() {}

export const config = {
  // Match nothing — middleware is disabled
  matcher: [],
}
