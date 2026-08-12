// NextAuth type augmentation — add `role` and `username` to the JWT token + session user
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    role?: 'superadmin' | 'analyst' | 'viewer'
    username?: string
  }
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: 'superadmin' | 'analyst' | 'viewer'
      username?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: 'superadmin' | 'analyst' | 'viewer'
    username?: string
  }
}
