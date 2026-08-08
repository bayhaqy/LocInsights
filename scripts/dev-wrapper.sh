#!/usr/bin/env bash
cd /home/z/my-project
echo "[$(date)] Starting Next.js dev server..."
exec node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 2>&1
