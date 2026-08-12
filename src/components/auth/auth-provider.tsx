'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

/**
 * Client-side SessionProvider wrapper for NextAuth.
 * Wrap the entire app so any component can use useSession().
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
