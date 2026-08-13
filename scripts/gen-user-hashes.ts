/**
 * Generate bcrypt hashes for the renamed users.
 * Run: bun run scripts/gen-user-hashes.ts
 */
import bcrypt from 'bcryptjs'

const ROUNDS = 10

const users = [
  { username: 'admin_map', password: 'admin_map' },
  { username: 'data_map',  password: 'data_map'  },
  { username: 'demo_map',  password: 'demo_map'  },
]

console.log('=== bcrypt hashes for renamed users ===\n')
for (const u of users) {
  const hash = bcrypt.hashSync(u.password, ROUNDS)
  console.log(`${u.username} / ${u.password}`)
  console.log(`  hash: ${hash}`)
  console.log('')
}

// Also output SQL UPDATE statements
console.log('=== SQL UPDATE statements ===\n')
for (const u of users) {
  const hash = bcrypt.hashSync(u.password, ROUNDS)
  const sqlHash = hash.replace(/'/g, "''")
  console.log(`UPDATE public.users SET username = '${u.username}', email = '${u.username}@locinsights.local', password_hash = '${sqlHash}', display_name = '${u.username.charAt(0).toUpperCase() + u.username.slice(1).replace('_map', ' Map')}', updated_at = CURRENT_TIMESTAMP WHERE username IN ('${u.username.replace('_map', '')}', '${u.username}');`)
}
