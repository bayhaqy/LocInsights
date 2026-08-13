/**
 * PUT /api/admin/roles/[id] — update a role's permissions (superadmin only).
 * POST /api/admin/roles/[id]?action=reset — reset role to default permissions.
 *
 * Body for PUT: { permissions: { menu_id: { read, create, update, delete, export }, ... } }
 * The superadmin role's permissions are locked (always full).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/auth-server'
import { db } from '@/lib/db'
import { DEFAULT_PERMISSIONS, MENU_LIST, type Permissions } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperadmin()
  if (!guard.ok) return guard.response
  try {
    const { id } = await params
    if (!['superadmin', 'admin', 'data', 'analyst', 'viewer'].includes(id)) {
      return NextResponse.json({ success: false, error: 'Invalid role id' }, { status: 400 })
    }
    // Lock superadmin permissions
    if (id === 'superadmin') {
      return NextResponse.json({ success: false, error: 'Super Admin permissions are locked' }, { status: 400 })
    }

    const body = await req.json()
    const incoming = body.permissions as Permissions
    if (!incoming || typeof incoming !== 'object') {
      return NextResponse.json({ success: false, error: 'permissions object required' }, { status: 400 })
    }

    // Sanitize: only allow known menus + valid boolean fields
    const validMenuIds = new Set(MENU_LIST.map(m => m.id))
    const cleaned: Permissions = {}
    for (const [menuId, perm] of Object.entries(incoming)) {
      if (!validMenuIds.has(menuId as any)) continue
      if (!perm || typeof perm !== 'object') continue
      cleaned[menuId] = {
        read: !!perm.read,
        create: !!perm.create,
        update: !!perm.update,
        delete: !!perm.delete,
        export: !!perm.export,
      }
    }
    // Ensure all menus are present (missing = NONE)
    for (const m of MENU_LIST) {
      if (!cleaned[m.id]) {
        cleaned[m.id] = { read: false, create: false, update: false, delete: false, export: false }
      }
    }
    // Force users-management to be NONE for non-superadmin roles
    if (id !== 'superadmin') {
      cleaned.users = { read: false, create: false, update: false, delete: false, export: false }
    }

    const updated = await db.role.update({
      where: { id },
      data: { permissions: cleaned as any },
      select: { id: true, name: true, permissions: true, updated_at: true },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    console.error('[admin/roles/[id]] PUT error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/admin/roles/[id]?action=reset — reset role to default permissions.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperadmin()
  if (!guard.ok) return guard.response
  try {
    const { id } = await params
    if (!['admin', 'data', 'analyst', 'viewer'].includes(id)) {
      return NextResponse.json({ success: false, error: 'Can only reset non-superadmin roles' }, { status: 400 })
    }
    const defaults = DEFAULT_PERMISSIONS[id as keyof typeof DEFAULT_PERMISSIONS]
    const updated = await db.role.update({
      where: { id },
      data: { permissions: defaults as any },
      select: { id: true, name: true, permissions: true, updated_at: true },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    console.error('[admin/roles/[id]] POST error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
