/**
 * GET /api/admin/roles — list all roles + their permissions (any authenticated user).
 *
 * Non-superadmin users can READ the role list (so client-side permission lookups
 * work). Mutations (PUT/POST) require superadmin — see [id]/route.ts.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const roles = await db.role.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true, description: true, permissions: true, is_system: true, updated_at: true },
    })
    return NextResponse.json({ success: true, data: roles })
  } catch (e: any) {
    console.error('[admin/roles] GET error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
