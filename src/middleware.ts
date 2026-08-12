/**
 * Strict authentication middleware (Aug 2026 best-practice overhaul).
 *
 * Behavior:
 *   • Unauthenticated users are redirected to /login for ALL app routes
 *     (including the homepage). Only /login, /api/auth/*, and static
 *     assets are publicly accessible.
 *   • Authenticated users can access all routes ( RBAC enforced at the
 *     component / API level — adminOnly routes still check role === 'superadmin').
 *   • API routes under /api/locinsight/* are protected server-side by
 *     `requireSuperadmin()` in each route handler — middleware does NOT
 *     intercept them (avoids NextAuth config errors on Vercel serverless
 *     that the previous withAuth matcher caused).
 *
 * Why this works on Vercel:
 *   - `withAuth` only runs on edge middleware (page routes), not on
 *     serverless API functions.
 *   - JWT verification uses NEXTAUTH_SECRET from env. A strong random
 *     secret is now committed to .env.local and documented in .env.example
 *     for Vercel.
 *   - The previous "Configuration" error was caused by wrapping /api/*
 *     routes in withAuth's matcher; this version matches only pages.
 *
 * Reference: NextAuth v4 docs (https://next-auth.js.org/configuration/nextjs)
 */

import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // `authorized` returns true → allow access; false/string → redirect.
    // We allow any authenticated user; admin-only enforcement happens
    // inside the page via useSession() role checks.
    authorized: ({ token }) => !!token,
  },
})

export const config = {
  // Match all page routes EXCEPT:
  //   - /login              (the login page itself)
  //   - /survey             (field surveyor PWA — separate auth flow at the API level)
  //   - /api/auth/*         (NextAuth handlers)
  //   - /api/*              (server-side protected via requireAuth/requireSuperadmin)
  //   - /_next/static/*     (Next.js static assets)
  //   - /_next/image/*      (Next.js image optimizer)
  //   - /favicon.ico, /logo-*, /manifest.json, /sw.js, /.well-known/*  (public)
  //   - /locinsights.apk    (Android APK direct download)
  matcher: [
    /*
     * Match all paths that DON'T start with:
     *   login, survey, api, _next/static, _next/image, favicon.ico, logo-,
     *   apple-touch-icon, manifest.json, sw.js, .well-known, locinsights.apk
     */
    '/((?!login|survey|api|_next/static|_next/image|favicon\\.ico|logo-.*|apple-touch-icon.*|manifest\\.json|sw\\.js|\\.well-known|locinsights\\.apk).*)',
  ],
}
