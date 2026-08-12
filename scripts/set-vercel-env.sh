#!/bin/bash
#
# Set required NextAuth env vars on Vercel.
#
# Usage:
#   1. Install Vercel CLI: npm i -g vercel
#   2. Login: vercel login
#   3. Run this script: bash scripts/set-vercel-env.sh
#
# This script sets:
#   - NEXTAUTH_SECRET (strong random secret for JWT signing)
#   - NEXTAUTH_URL (production URL)
#
# NOTE (Aug 2026): The superadmin is NO LONGER managed via env vars.
#   - The `bayhaqy` superadmin is seeded DIRECTLY into the Supabase users
#     table by running: `bun run scripts/seed-superadmin.ts`
#   - That script is idempotent — safe to re-run anytime.
#   - To rotate the superadmin password, re-run with --reset-password or
#     --password "NewStrongPass123".
#
# After setting these env vars + seeding the superadmin, trigger a redeploy:
#   vercel --prod
#

set -e

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI not installed. Run: npm i -g vercel"
  exit 1
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
  echo "❌ Not logged in to Vercel. Run: vercel login"
  exit 1
fi

echo "Setting NextAuth env vars on Vercel..."
echo ""

# Generate a strong NEXTAUTH_SECRET
SECRET=$(openssl rand -base64 32)
echo "Generated NEXTAUTH_SECRET: $SECRET"

# Set env vars (use --force to overwrite if already exists)
echo ""
echo "Setting NEXTAUTH_SECRET..."
echo "$SECRET" | vercel env add NEXTAUTH_SECRET production --force

echo "Setting NEXTAUTH_URL..."
echo "https://locinsights.bayhaqy.my.id" | vercel env add NEXTAUTH_URL production --force

# Clean up legacy superadmin env vars (no longer used)
echo ""
echo "Cleaning up legacy superadmin env vars (no longer used)..."
vercel env rm NEXTAUTH_SUPERADMIN_USERNAME production --yes 2>/dev/null || true
vercel env rm NEXTAUTH_SUPERADMIN_PASSWORD_HASH production --yes 2>/dev/null || true

echo ""
echo "✅ Vercel env vars set!"
echo ""
echo "NEXT STEP — seed the superadmin into the Supabase users table:"
echo "  bun run scripts/seed-superadmin.ts"
echo ""
echo "Then trigger a production deploy:"
echo "  vercel --prod  (or push a new commit to main for auto-deploy)"
echo ""
echo "Login credentials (after seeding):"
echo "  Username: bayhaqy"
echo "  Password: LockInsight@01!!"
echo ""
echo "⚠️  To rotate the password later:"
echo "  bun run scripts/seed-superadmin.ts --reset-password"
echo "  bun run scripts/seed-superadmin.ts --password \"NewStrongPass123\""
