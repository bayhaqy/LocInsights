/**
 * /api/admin/users — User & Role management API (superadmin-only).
 *
 * GET    /api/admin/users           → list all users (paginated, no password_hash)
 * POST   /api/admin/users           → create a new user
 * PUT    /api/admin/users?id=...    → update user (role, is_active, display_name, email, password)
 * DELETE /api/admin/users?id=...    → delete user (cannot delete self or last superadmin)
 *
 * All mutations require `requireSuperadmin()` and are audit-logged.
 *
 * Security:
 *   - Passwords NEVER returned in responses (filtered out explicitly).
 *   - Password updates require the new plaintext (hashed server-side with bcrypt 10 rounds).
 *   - Cannot demote/delete self (prevents lockout).
 *   - Cannot demote/delete the last remaining superadmin (prevents lockout).
 *   - All mutations audit-logged with actor_id from session.
 */

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db as prisma } from '@/lib/db'
import { requireSuperadmin } from '@/lib/auth-server'
import { Prisma } from '@prisma/client'

type Role = 'superadmin' | 'analyst' | 'viewer'

const VALID_ROLES: Role[] = ['superadmin', 'analyst', 'viewer']

function sanitizeUser(u: any) {
  const { password_hash, ...rest } = u
  return rest
}

// GET — list all users
export async function GET(req: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const includeInactive = searchParams.get('include_inactive') !== 'false'

    const where: Prisma.UserWhereInput = {}
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { display_name: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (role && VALID_ROLES.includes(role as Role)) {
      where.role = role as Role
    }
    if (!includeInactive) where.is_active = true

    const users = await prisma.user.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 500,
    })

    const total = await prisma.user.count({ where })

    return NextResponse.json({
      success: true,
      data: users.map(sanitizeUser),
      total,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// POST — create a new user
export async function POST(req: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response
  const actorId = (auth.session.user as any)?.id || null
  const actorIp = req.headers.get('x-forwarded-for')?.split(',')[0] || null

  try {
    const body = await req.json()
    const { username, email, display_name, password, role, is_active } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      )
    }
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }
    const finalRole: Role = VALID_ROLES.includes(role) ? role : 'viewer'

    // Check for existing username
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 409 }
      )
    }
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } })
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 409 }
        )
      }
    }

    const password_hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        username,
        email: email || null,
        display_name: display_name || null,
        password_hash,
        role: finalRole,
        is_active: is_active !== false,
        created_by: actorId,
      },
    })

    await prisma.userAuditLog.create({
      data: {
        user_id: user.id,
        actor_id: actorId,
        action: 'create',
        details: { username, role: finalRole, email: email || null },
        ip_address: actorIp,
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, data: sanitizeUser(user) })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response
  const actorId = (auth.session.user as any)?.id || null
  const actorIp = req.headers.get('x-forwarded-for')?.split(',')[0] || null

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'id query param required' }, { status: 400 })
    }

    const body = await req.json()
    const { display_name, email, role, is_active, password, reset_lockout } = body

    // Prevent self-demotion / self-deactivation
    if (id === actorId) {
      if (role && role !== 'superadmin') {
        return NextResponse.json(
          { success: false, error: 'Cannot demote yourself. Ask another superadmin.' },
          { status: 400 }
        )
      }
      if (is_active === false) {
        return NextResponse.json(
          { success: false, error: 'Cannot deactivate yourself. Ask another superadmin.' },
          { status: 400 }
        )
      }
    }

    // Prevent demoting/deactivating the last superadmin
    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    if (targetUser.role === 'superadmin' && (role !== 'superadmin' || is_active === false)) {
      const superadminCount = await prisma.user.count({
        where: { role: 'superadmin', is_active: true },
      })
      if (superadminCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'Cannot demote or deactivate the last active superadmin.' },
          { status: 400 }
        )
      }
    }

    const update: Prisma.UserUpdateInput = {}
    if (display_name !== undefined) update.display_name = display_name
    if (email !== undefined) {
      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing && existing.id !== id) {
          return NextResponse.json(
            { success: false, error: 'Email already in use' },
            { status: 409 }
          )
        }
      }
      update.email = email || null
    }
    if (role !== undefined && VALID_ROLES.includes(role)) update.role = role
    if (is_active !== undefined) update.is_active = is_active
    if (password) {
      if (password.length < 8) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 8 characters' },
          { status: 400 }
        )
      }
      update.password_hash = await bcrypt.hash(password, 10)
    }
    if (reset_lockout) {
      update.failed_login_count = 0
      update.locked_until = null
    }

    const user = await prisma.user.update({ where: { id }, data: update })

    await prisma.userAuditLog.create({
      data: {
        user_id: id,
        actor_id: actorId,
        action: 'update',
        details: { fields: Object.keys(update) },
        ip_address: actorIp,
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, data: sanitizeUser(user) })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperadmin()
  if (!auth.ok) return auth.response
  const actorId = (auth.session.user as any)?.id || null
  const actorIp = req.headers.get('x-forwarded-for')?.split(',')[0] || null

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'id query param required' }, { status: 400 })
    }

    if (id === actorId) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete yourself. Ask another superadmin.' },
        { status: 400 }
      )
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }
    if (target.role === 'superadmin') {
      const superadminCount = await prisma.user.count({
        where: { role: 'superadmin', is_active: true },
      })
      if (superadminCount <= 1) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete the last active superadmin.' },
          { status: 400 }
        )
      }
    }

    await prisma.userAuditLog.create({
      data: {
        user_id: id,
        actor_id: actorId,
        action: 'delete',
        details: { username: target.username, role: target.role },
        ip_address: actorIp,
      },
    }).catch(() => {})

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
