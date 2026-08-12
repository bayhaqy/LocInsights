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
#   - NEXTAUTH_SUPERADMIN_USERNAME (default: bayhaqy)
#   - NEXTAUTH_SUPERADMIN_PASSWORD_HASH (bcrypt hash of "LockInsight@01!!")
#
# After setting these, trigger a redeploy:
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

echo "Setting NEXTAUTH_SUPERADMIN_USERNAME..."
echo "bayhaqy" | vercel env add NEXTAUTH_SUPERADMIN_USERNAME production --force

# Bcrypt hash of "LockInsight@01!!" (10 rounds)
echo "Setting NEXTAUTH_SUPERADMIN_PASSWORD_HASH..."
echo '$2b$10$zidc.l/W86v/6sRRKX3rXuWyuSbrWIZnVy4rKmY1mcEL/yb9Ao7UW' | vercel env add NEXTAUTH_SUPERADMIN_PASSWORD_HASH production --force

echo ""
echo "✅ All env vars set!"
echo ""
echo "Next steps:"
echo "  1. Trigger a production deploy: vercel --prod"
echo "  2. Or push a new commit to main (auto-deploy)"
echo "  3. Verify: curl -sS -o /dev/null -w '%{http_code}' https://locinsights.bayhaqy.my.id/"
echo "     Should return 307 (redirect to /login)"
echo ""
echo "Login credentials:"
echo "  Username: bayhaqy"
echo "  Password: LockInsight@01!!"
echo ""
echo "⚠️  To change the password:"
echo "  1. Generate new hash: node scripts/gen-hash.js"
echo "  2. Update NEXTAUTH_SUPERADMIN_PASSWORD_HASH on Vercel"
