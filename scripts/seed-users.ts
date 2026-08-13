/**
 * LocInsights — User & Role Seed Script
 *
 * Idempotent: safe to re-run. Creates/updates the 4 default users + 5 system roles.
 *
 * Usage:
 *   bun run scripts/seed-users.ts                    # create/update all default users
 *   bun run scripts/seed-users.ts --reset-password   # reset all passwords to defaults
 *   bun run scripts/seed-users.ts --password=admin_map --new-pass=secret123   # reset one user's password
 *
 * Default users (with their default passwords):
 *   bayhaqy    / LocInsights@01!!   → superadmin     (platform-wide, tenant_id=NULL)
 *   admin_map  / admin_map          → admin          (tenant: MAP Active Adiperkasa)
 *   data_map   / data_map           → data           (tenant: MAP Active Adiperkasa)
 *   demo_map   / demo_map           → viewer         (tenant: MAP Active Adiperkasa)
 *
 * Default tenant for existing data: tnt_map_active_0001 (MAP Active Adiperkasa)
 */

import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ROUNDS = 10
const DEFAULT_TENANT_ID = 'tnt_map_active_0001'

// =====================================================
// Parse args
// =====================================================
const args = process.argv.slice(2)
const shouldResetAll = args.includes('--reset-password')
const userArgIdx = args.indexOf('--password')
const newPassIdx = args.indexOf('--new-pass')
const resetOneUser = userArgIdx >= 0 ? args[userArgIdx + 1] : null
const resetOnePass = newPassIdx >= 0 ? args[newPassIdx + 1] : null

// =====================================================
// Default users config
// =====================================================
interface SeedUser {
  username: string
  password: string
  email: string
  display_name: string
  role: string  // matches user_role_enum
  tenant_id: string | null  // NULL for superadmin
}

const SEED_USERS: SeedUser[] = [
  {
    username: 'bayhaqy',
    password: 'LocInsights@01!!',
    email: 'bayhaqy@locinsights.local',
    display_name: 'Achmad Bayhaqy',
    role: 'superadmin',
    tenant_id: null,
  },
  {
    username: 'admin_map',
    password: 'admin_map',
    email: 'admin_map@locinsights.local',
    display_name: 'Admin Map',
    role: 'admin',
    tenant_id: DEFAULT_TENANT_ID,
  },
  {
    username: 'data_map',
    password: 'data_map',
    email: 'data_map@locinsights.local',
    display_name: 'Data Map',
    role: 'data',
    tenant_id: DEFAULT_TENANT_ID,
  },
  {
    username: 'demo_map',
    password: 'demo_map',
    email: 'demo_map@locinsights.local',
    display_name: 'Demo Map',
    role: 'viewer',
    tenant_id: DEFAULT_TENANT_ID,
  },
]

// =====================================================
// Default roles (idempotent UPSERT)
// =====================================================
import { DEFAULT_PERMISSIONS } from '../src/lib/permissions'

const SEED_ROLES = [
  { id: 'superadmin',    name: 'Superadmin',     description: 'Full system access including user & role management. Platform-wide (no tenant scope).' },
  { id: 'admin',         name: 'Admin',          description: 'All features except Users Management. Tenant-scoped.' },
  { id: 'tenant_admin',  name: 'Tenant Admin',   description: 'Same as admin + can manage users within their own tenant.' },
  { id: 'data',          name: 'Data',           description: 'Full CRUD on Reports, Data Manager & Scraper only. Read-only elsewhere.' },
  { id: 'analyst',       name: 'Analyst',        description: 'Read + run ML/AI forecasts (no master data mutations).' },
  { id: 'viewer',        name: 'Viewer',         description: 'Read-only access, no exports.' },
]

// =====================================================
// Main
// =====================================================
async function main() {
  console.log('=== LocInsights User & Role Seed ===\n')

  // Ensure default tenant exists
  const tenant = await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    update: {},
    create: {
      id: DEFAULT_TENANT_ID,
      name: 'MAP Active Adiperkasa',
      slug: 'map-active',
      plan: 'internal',
      status: 'active',
      region_scope: ['bali'],
      app_name: 'LocInsights',
      contact_name: 'Achmad Bayhaqy',
      contact_email: 'bayhaqy@locinsights.local',
      notes: 'Default tenant for existing MAA data (Bali PoC).',
      max_users: 50,
      max_api_calls_per_day: 100000,
      created_by: 'system',
    },
  })
  console.log(`✓ Default tenant: ${tenant.name} (${tenant.id})`)

  // Seed roles
  console.log('\n--- Seeding roles ---')
  for (const role of SEED_ROLES) {
    const permissions = (DEFAULT_PERMISSIONS as any)[role.id] || DEFAULT_PERMISSIONS.viewer
    const updated = await prisma.role.upsert({
      where: { id: role.id },
      update: {
        name: role.name,
        description: role.description,
        permissions: permissions as any,
        is_system: true,
        is_tenant_scoped: false,
        tenant_id: null,
      },
      create: {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: permissions as any,
        is_system: true,
        is_tenant_scoped: false,
        tenant_id: null,
      },
    })
    console.log(`  ✓ ${updated.id} (${updated.name})`)
  }

  // Seed users
  console.log('\n--- Seeding users ---')
  for (const u of SEED_USERS) {
    // Determine if password should be reset
    let passwordHash: string
    if (shouldResetAll) {
      passwordHash = bcrypt.hashSync(u.password, ROUNDS)
      console.log(`  [reset-password] ${u.username}`)
    } else if (resetOneUser && resetOneUser === u.username && resetOnePass) {
      passwordHash = bcrypt.hashSync(resetOnePass, ROUNDS)
      console.log(`  [reset-password] ${u.username} → custom password`)
    } else {
      // Keep existing password hash if user already exists; otherwise hash default
      const existing = await prisma.user.findUnique({ where: { username: u.username } })
      if (existing) {
        passwordHash = existing.password_hash
      } else {
        passwordHash = bcrypt.hashSync(u.password, ROUNDS)
      }
    }

    const updated = await prisma.user.upsert({
      where: { username: u.username },
      update: {
        email: u.email,
        display_name: u.display_name,
        password_hash: passwordHash,
        role: u.role as any,
        tenant_id: u.tenant_id,
        default_tenant_id: u.tenant_id || DEFAULT_TENANT_ID,
        is_active: true,
        // Reset lockout counters on seed
        failed_login_count: 0,
        locked_until: null,
      },
      create: {
        username: u.username,
        email: u.email,
        display_name: u.display_name,
        password_hash: passwordHash,
        role: u.role as any,
        tenant_id: u.tenant_id,
        default_tenant_id: u.tenant_id || DEFAULT_TENANT_ID,
        is_active: true,
        created_by: 'system',
      },
    })
    console.log(`  ✓ ${updated.username} (${updated.role}) → tenant: ${updated.tenant_id || 'NULL (platform)'}`)
  }

  // Summary
  console.log('\n=== Summary ===')
  const userCount = await prisma.user.count()
  const roleCount = await prisma.role.count()
  const tenantCount = await prisma.tenant.count()
  console.log(`  Users:   ${userCount}`)
  console.log(`  Roles:   ${roleCount}`)
  console.log(`  Tenants: ${tenantCount}`)

  // List users
  console.log('\n--- Users ---')
  const users = await prisma.user.findMany({
    select: { username: true, role: true, tenant_id: true, is_active: true, last_login_at: true },
    orderBy: { created_at: 'asc' },
  })
  for (const u of users) {
    const tenant = u.tenant_id ? await prisma.tenant.findUnique({ where: { id: u.tenant_id }, select: { name: true } }) : null
    console.log(`  ${u.username.padEnd(12)} | ${u.role.padEnd(14)} | tenant: ${(tenant?.name || 'PLATFORM').padEnd(28)} | active: ${u.is_active} | last: ${u.last_login_at?.toISOString() || 'never'}`)
  }

  console.log('\n✅ Seed complete.')
  console.log('\nDefault credentials:')
  for (const u of SEED_USERS) {
    console.log(`  ${u.username} / ${u.password}`)
  }
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
