#!/usr/bin/env bun
/**
 * LocInsights — seed application users + role definitions.
 *
 * Creates 5 built-in roles (superadmin, admin, data, analyst, viewer) with their
 * default permission matrices, and seeds 4 default users:
 *
 *   bayhaqy / LocInsights@01!!   → superadmin
 *   admin    / admin              → admin
 *   data     / data               → data
 *   demo     / demo               → viewer
 *
 * Usage:
 *   bun run scripts/seed-users.ts
 *   bun run scripts/seed-users.ts --reset-password admin NewPass123!
 *
 * Idempotent: re-running updates existing users/roles in place.
 */
import { config } from 'dotenv'
config({ path: process.cwd() + '/.env.local' })

const { PrismaClient } = await import('@prisma/client')
const bcrypt = await import('bcryptjs')
const prisma = new PrismaClient()

import { DEFAULT_PERMISSIONS, MENU_LIST, ROLE_DESCRIPTIONS, type RoleId } from '../src/lib/permissions'

interface SeedUser {
  username: string
  password: string
  display_name: string
  email: string
  role: RoleId
}

const SEED_USERS: SeedUser[] = [
  { username: 'bayhaqy', password: 'LocInsights@01!!', display_name: 'Achmad Bayhaqy', email: 'bayhaqy@locinsights.local', role: 'superadmin' },
  { username: 'admin',   password: 'admin',            display_name: 'Administrator',  email: 'admin@locinsights.local',   role: 'admin' },
  { username: 'data',    password: 'data',             display_name: 'Data Operator',  email: 'data@locinsights.local',    role: 'data' },
  { username: 'demo',    password: 'demo',             display_name: 'Demo Viewer',    email: 'demo@locinsights.local',    role: 'viewer' },
]

async function seedRoles() {
  console.log('=== Seeding roles ===')
  for (const roleId of Object.keys(DEFAULT_PERMISSIONS) as RoleId[]) {
    const perms = DEFAULT_PERMISSIONS[roleId]
    const menuCount = Object.keys(perms).length
    await prisma.role.upsert({
      where: { id: roleId },
      create: {
        id: roleId,
        name: roleId.charAt(0).toUpperCase() + roleId.slice(1),
        description: ROLE_DESCRIPTIONS[roleId],
        permissions: perms as any,
        is_system: true,
      },
      update: {
        name: roleId.charAt(0).toUpperCase() + roleId.slice(1),
        description: ROLE_DESCRIPTIONS[roleId],
        permissions: perms as any,
      },
    })
    console.log(`  ✓ role ${roleId} (${menuCount} menu permissions)`)
  }
}

async function seedUsers(opts: { resetPassword?: { username: string; newPass: string } | null }) {
  console.log('\n=== Seeding users ===')
  for (const u of SEED_USERS) {
    const existing = await prisma.user.findUnique({ where: { username: u.username } })
    if (existing) {
      const data: any = {
        display_name: u.display_name,
        email: u.email,
        role: u.role,
        is_active: true,
      }
      if (opts.resetPassword && opts.resetPassword.username === u.username) {
        data.password_hash = await bcrypt.hash(opts.resetPassword.newPass, 10)
        console.log(`  ↻ ${u.username} — password reset to provided value`)
      } else if (opts.resetPassword && opts.resetPassword.username === 'all') {
        data.password_hash = await bcrypt.hash(u.password, 10)
        console.log(`  ↻ ${u.username} — password reset to default`)
      }
      await prisma.user.update({ where: { username: u.username }, data })
      console.log(`  ✓ ${u.username} updated (role: ${u.role})`)
    } else {
      const hashed = await bcrypt.hash(u.password, 10)
      await prisma.user.create({
        data: {
          username: u.username,
          password_hash: hashed,
          display_name: u.display_name,
          email: u.email,
          role: u.role,
        },
      })
      console.log(`  + ${u.username} created (role: ${u.role})`)
    }
  }
}

async function main() {
  console.log('LocInsights user & role seeder\n')

  const args = process.argv.slice(2)
  let resetPassword: { username: string; newPass: string } | null = null
  if (args[0] === '--reset-password') {
    if (args[1] === 'all') {
      resetPassword = { username: 'all', newPass: '' }
    } else if (args[1] && args[2]) {
      resetPassword = { username: args[1], newPass: args[2] }
    } else {
      console.error('Usage: --reset-password <username> <newPassword>  OR  --reset-password all')
      process.exit(1)
    }
  }

  await seedRoles()
  await seedUsers({ resetPassword })

  console.log('\n=== Summary ===')
  const roles = await prisma.role.findMany()
  console.log(`Roles: ${roles.map(r => r.id).join(', ')}`)
  const users = await prisma.user.findMany({ select: { username: true, role: true, is_active: true } })
  console.log(`Users (${users.length}):`)
  for (const u of users) {
    console.log(`  - ${u.username.padEnd(10)} → ${u.role.padEnd(10)} [${u.is_active ? 'active' : 'inactive'}]`)
  }
  console.log('\nDefault credentials:')
  for (const u of SEED_USERS) {
    console.log(`  ${u.username.padEnd(10)} / ${u.password.padEnd(20)} → ${u.role}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
