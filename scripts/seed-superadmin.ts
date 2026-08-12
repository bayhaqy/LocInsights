/**
 * Seed the `bayhaqy` superadmin user directly into the Supabase `users` table.
 *
 * This REPLACES the previous env-var-based bootstrap (NEXTAUTH_SUPERADMIN_PASSWORD_HASH).
 * The user requested that we just add the bayhaqy user directly to the users
 * table with role=superadmin — no env vars needed.
 *
 * Idempotent:
 *   - If the user does not exist → create it with superadmin role.
 *   - If the user exists but role != superadmin → upgrade to superadmin.
 *   - If the user exists and is already superadmin → only update password_hash
 *     if --reset-password flag is passed.
 *
 * Usage:
 *   bun run scripts/seed-superadmin.ts                  # create or upgrade
 *   bun run scripts/seed-superadmin.ts --reset-password # also rotate password
 *   bun run scripts/seed-superadmin.ts --password <pw>  # use custom password
 *
 * Default password: "LockInsight@01!!" (the one the user is already using).
 *
 * Env vars needed (read from .env.local or process env):
 *   - DATABASE_URL         (Supabase transaction pooler)
 *   - DIRECT_URL           (Supabase session pooler / direct connection)
 *
 * After running, the user can sign in at /login with:
 *   username: bayhaqy
 *   password: LockInsight@01!!   (or whatever was passed)
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const DEFAULT_USERNAME = 'bayhaqy'
const DEFAULT_PASSWORD = 'LockInsight@01!!'
const DEFAULT_EMAIL = 'bayhaqy@locinsight.local'
const DEFAULT_DISPLAY_NAME = 'Achmad Bayhaqy'

async function main() {
  const args = process.argv.slice(2)
  const resetPassword = args.includes('--reset-password')
  const passwordIdx = args.indexOf('--password')
  const usernameIdx = args.indexOf('--username')
  const customPassword = passwordIdx >= 0 ? args[passwordIdx + 1] : null
  const customUsername = usernameIdx >= 0 ? args[usernameIdx + 1] : null

  if (customPassword && customPassword.length < 8) {
    console.error('❌ Password must be at least 8 characters')
    process.exit(1)
  }

  const username = customUsername || DEFAULT_USERNAME
  const password = customPassword || DEFAULT_PASSWORD

  console.log(`\n🔐 Seeding superadmin '${username}' into Supabase users table...`)

  // Check if user exists
  const existing = await db.user.findUnique({ where: { username } }).catch(() => null)

  const password_hash = await bcrypt.hash(password, 10)

  if (!existing) {
    // Create new superadmin
    const user = await db.user.create({
      data: {
        username,
        email: DEFAULT_EMAIL,
        display_name: DEFAULT_DISPLAY_NAME,
        password_hash,
        role: 'superadmin',
        is_active: true,
        created_by: 'seed-superadmin-script',
      },
    })
    console.log(`✅ Created superadmin user:`)
    console.log(`   - id           : ${user.id}`)
    console.log(`   - username     : ${user.username}`)
    console.log(`   - email        : ${user.email}`)
    console.log(`   - role         : ${user.role}`)
    console.log(`   - is_active    : ${user.is_active}`)
    console.log(`   - password     : ${customPassword ? '(custom — set by you)' : '(default: LockInsight@01!!)'}`)
  } else {
    // Existing user — ensure role is superadmin + active
    const updates: any = { role: 'superadmin', is_active: true }
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
    console.log(`   - role         : ${updated.role} ${existing.role !== 'superadmin' ? '(upgraded from ' + existing.role + ')' : ''}`)
    console.log(`   - is_active    : ${updated.is_active}`)
    console.log(`   - password     : ${resetPassword || customPassword ? '(rotated)' : '(unchanged — use --reset-password to rotate)'}`)
  }

  // Verify
  const count = await db.user.count({ where: { role: 'superadmin', is_active: true } })
  console.log(`\n📊 Active superadmin count: ${count}`)
  if (count === 0) {
    console.error('❌ No active superadmin found after seed — something went wrong.')
    process.exit(1)
  }

  console.log(`\n✨ Done. You can now sign in at /login with username '${username}'.`)
  console.log(`\n💡 TIP: To rotate the password later, run:`)
  console.log(`   bun run scripts/seed-superadmin.ts --reset-password`)
  console.log(`   bun run scripts/seed-superadmin.ts --password "NewStrongPass123"\n`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
