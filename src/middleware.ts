/**
 * LocInsights — NextAuth Middleware
 *
 * Protects all routes except explicitly public ones.
 * Public: /, /login, /survey (PWA), /api/auth/*,
 *         /api/locinsight/field-survey (PWA submit),
 *         /api/locinsight/countries|provinces|kabupaten|kecamatan|kelurahan|locations
 *           (shared admin-boundary reference data — reads are public, writes
 *           still require superadmin via requireSuperadmin() in the handler),
 *         /api/docs (public docs listing for marketing page),
 *         static assets, _next, manifest, sw.js, etc.
 *
 * Authenticated users can access any /dashboard, /map, /opportunities, etc.
 * Per-route role/permission checks happen at the route handler level (requireSuperadmin, etc.).
 *
 * NOTE: /api/admin/* and /api/auth/switch-tenant are matched by the middleware
 * (require a token), but the actual permission/tenant validation happens in
 * the route handlers via requireAuth() / requireSuperadmin() / canAccessTenant().
 */

import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
})

export const config = {
  // Match all routes EXCEPT:
  // - /                (public marketing landing page)
  // - /login, /survey  (public auth + PWA survey)
  // - /api/auth/*      (NextAuth endpoints, incl. switch-tenant)
  // - /api/locinsight/field-survey  (PWA survey submission — anon allowed)
  // - /api/locinsight/{countries,provinces,kabupaten,kecamatan,kelurahan,locations}
  //                    (shared admin-boundary reference data — GET public,
  //                     writes still enforced via requireSuperadmin in handler)
  // - /api/docs        (public docs listing for marketing page)
  // - /_next/*         (Next.js internals)
  // - /favicon.ico, /logo*, /apple-touch-icon*, /manifest.json, /sw.js, /locinsights.apk
  // - /.well-known/*
  // - /geojson/*, /robots.txt
  //
  // The leading `^$` alternation excludes the root path "/" itself.
  matcher: [
    '/((?!^$|login|survey|api/auth|api/locinsight/field-survey|api/locinsight/countries|api/locinsight/provinces|api/locinsight/kabupaten|api/locinsight/kecamatan|api/locinsight/kelurahan|api/locinsight/locations|api/docs|_next/static|_next/image|favicon\\.ico|logo-.*|apple-touch-icon.*|manifest\\.json|sw\\.js|\\.well-known|locinsights\\.apk|robots\\.txt|geojson).*)',
  ],
}
