#!/usr/bin/env bash
cd /home/z/my-project
while true; do
  echo "[$(date +%H:%M:%S)] Starting Next.js..."
  node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 2>&1
  echo "[$(date +%H:%M:%S)] Next.js exited (code $?), restarting in 2s..."
  sleep 2
done
