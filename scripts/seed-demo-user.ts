/**
 * Seed a `demo` user with role=viewer into the Supabase users table.
 *
 * Per user request (Aug 2026):
 *   - Username: demo
 *   - Password: demo
 *   - Role: viewer (read-only — cannot manage users, cannot export)
 *
 * NOTE: The password "demo" is intentionally short (4 chars) for easy testing.
 * The /api/admin/users POST endpoint enforces a min-8-char password rule, so
 * this seed script BYPASSES the API and writes directly to the DB via Prisma.
 * The login flow (src/lib/auth.ts authorize) does NOT enforce a password
 * length on login — it only checks bcrypt.compare — so a 4-char password
 * works for authentication.
 *
 * This script is idempotent — safe to re-run anytime.
 *
 * Usage:
 *   bun run scripts/seed-demo-user.ts                  # create or upgrade
 *   bun run scripts/seed-demo-user.ts --reset-password # also rotate password
 *   bun run scripts/seed-demo-user.ts --password <pw>  # use custom password
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const DEFAULT_USERNAME = 'demo'
const DEFAULT_PASSWORD = 'demo'
const DEFAULT_EMAIL = 'demo@locinsight.local'
const DEFAULT_DISPLAY_NAME = 'Demo Viewer'

async function main() {
  const args = process.argv.slice(2)
  const resetPassword = args.includes('--reset-password')
  const passwordIdx = args.indexOf('--password')
  const usernameIdx = args.indexOf('--username')
  const customPassword = passwordIdx >= 0 ? args[passwordIdx + 1] : null
  const customUsername = usernameIdx >= 0 ? args[usernameIdx + 1] : null

  const username = customUsername || DEFAULT_USERNAME
  const password = customPassword || DEFAULT_PASSWORD

  console.log(`\n👤 Seeding demo viewer '${username}' into Supabase users table...`)

  // Check if user exists
  const existing = await db.user.findUnique({ where: { username } }).catch(() => null)

  const password_hash = await bcrypt.hash(password, 10)

  if (!existing) {
    // Create new demo viewer
    const user = await db.user.create({
      data: {
        username,
        email: DEFAULT_EMAIL,
        display_name: DEFAULT_DISPLAY_NAME,
        password_hash,
        role: 'viewer',
        is_active: true,
        created_by: 'seed-demo-script',
      },
    })
    console.log(`✅ Created demo viewer user:`)
    console.log(`   - id           : ${user.id}`)
    console.log(`   - username     : ${user.username}`)
    console.log(`   - email        : ${user.email}`)
    console.log(`   - role         : ${user.role}`)
    console.log(`   - is_active    : ${user.is_active}`)
    console.log(`   - password     : ${customPassword ? '(custom — set by you)' : '(default: demo)'}`)
  } else {
    // Existing user — ensure role is viewer + active
    const updates: any = { role: 'viewer', is_active: true }
    if (resetPassword || customPassword) {
      updates.password_hash = password_hash
    }
    if (!existing.email) updates.email = DEFAULT_EMAIL
    if (!existing.display_name) updates.display_name = DEFAULT_DISPLAY_NAME

    const updated = await db.user.update({
      where: { id: existing.id },
      data: updates,
    })
    console.log(`✅ Updated existing user:`)
    console.log(`   - id           : ${updated.id}`)
    console.log(`   - username     : ${updated.username}`)
    console.log(`   - role         : ${updated.role} ${existing.role !== 'viewer' ? '(changed from ' + existing.role + ')' : ''}`)
    console.log(`   - is_active    : ${updated.is_active}`)
    console.log(`   - password     : ${resetPassword || customPassword ? '(rotated)' : '(unchanged — use --reset-password to rotate)'}`)
  }

  // Verify
  const count = await db.user.count({ where: { role: 'viewer', is_active: true } })
  console.log(`\n📊 Active viewer count: ${count}`)

  console.log(`\n✨ Done. The demo viewer can sign in at /login with username '${username}'.`)
  console.log(`\n🔒 Viewer restrictions:`)
  console.log(`   - Cannot see the "Users Management" menu (superadmin-only)`)
  console.log(`   - Cannot use any export buttons (Export Selection Columns, CSV, XLSX)`)
  console.log(`   - Cannot import data`)
  console.log(`   - Read-only access to dashboards, maps, and tables\n`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
