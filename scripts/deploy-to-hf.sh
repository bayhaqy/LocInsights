#!/usr/bin/env bash
# =============================================================
# deploy-to-hf.sh — Deploy LocInsight ML Engine to Hugging Face Spaces
#
# PREREQUISITE: Hugging Face PRO subscription ($9/month) is required
# for Docker Spaces on free cpu-basic tier.
# Subscribe at: https://huggingface.co/pro
#
# Once PRO is active, run this script to deploy.
# =============================================================
set -euo pipefail

HF_TOKEN="${HF_TOKEN:?Set HF_TOKEN env var to your Hugging Face access token}"
SPACE_NAME="locinsight-ml"
SPACE_URL="https://huggingface.co/spaces/Bayhaqy/${SPACE_NAME}"

echo "=== Step 1: Creating HF Space (Docker SDK) ==="
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "https://huggingface.co/api/repos/create" \
  -H "Authorization: Bearer $HF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"space\",
    \"name\": \"${SPACE_NAME}\",
    \"sdk\": \"docker\",
    \"license\": \"apache-2.0\",
    \"private\": false,
    \"description\": \"LocInsight ML Engine — site selection scoring + Bali scraping worker\"
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "402" ]; then
  echo "✗ Cannot create Space: PRO subscription required."
  echo "  Subscribe at: https://huggingface.co/pro"
  echo "  Then re-run this script."
  exit 1
elif [ "$HTTP_CODE" = "409" ] || echo "$BODY" | grep -q "already exists"; then
  echo "✓ Space already exists"
elif [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
  echo "✗ Failed to create Space (HTTP $HTTP_CODE):"
  echo "  $BODY"
  exit 1
else
  echo "✓ Space created: $SPACE_URL"
fi

echo ""
echo "=== Step 2: Configure Space Secrets ==="
echo "Set these secrets in the Space settings (Settings > Secrets):"
echo "  SUPABASE_URL=https://fcyhrzzfvdsghtummizv.supabase.co"
echo "  SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>"
echo "  LOCINSIGHT_API_TOKEN=<generate with: openssl rand -hex 32>"
echo "  CORS_ALLOWED_ORIGINS=https://locinsights.vercel.app"
echo ""
echo "Set secrets via API:"
# Generate a strong API token
if [ -z "${LOCINSIGHT_API_TOKEN:-}" ]; then
  LOCINSIGHT_API_TOKEN=$(openssl rand -hex 32)
  echo "  (Generated LOCINSIGHT_API_TOKEN: $LOCINSIGHT_API_TOKEN)"
fi

for SECRET_NAME in SUPABASE_URL LOCINSIGHT_API_TOKEN CORS_ALLOWED_ORIGINS; do
  SECRET_VAL=$(eval echo "\${${SECRET_NAME}}")
  if [ -n "$SECRET_VAL" ]; then
    echo "  Setting $SECRET_NAME..."
    curl -s -X POST "https://huggingface.co/api/spaces/Bayhaqy/${SPACE_NAME}/secrets" \
      -H "Authorization: Bearer $HF_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"key\": \"${SECRET_NAME}\", \"value\": \"${SECRET_VAL}\"}" > /dev/null
  fi
done

echo ""
echo "=== Step 3: Connect Space to GitHub repo ==="
echo "The Space will auto-sync from github.com/bayhaqy/LocInsights_ml"
echo "To enable auto-sync, go to: $SPACE_URL/settings"
echo "  → Repository → Connect → bayhaqy/LocInsights_ml"

echo ""
echo "=== Step 4: Push code to Space (manual sync) ==="
cd /home/z/my-project/deploy/LocInsights_ml
# Add HF as a remote and push
git remote remove space 2>/dev/null || true
git remote add space "https://bayhaqy:${HF_TOKEN}@huggingface.co/spaces/Bayhaqy/${SPACE_NAME}.git"
git push space main -f 2>&1 | tail -5 || echo "(push may fail if Space was just created — wait 30s and retry)"

echo ""
echo "=== Done ==="
echo "Space URL: $SPACE_URL"
echo "Health endpoint: https://bayhaqy-${SPACE_NAME}.hf.space/health"
echo "API token (save this!): $LOCINSIGHT_API_TOKEN"
