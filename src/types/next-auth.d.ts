// NextAuth type augmentation — add `role`, `username`, `id` to the JWT token + session user
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    id?: string
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
    user_id?: string
  }
}
