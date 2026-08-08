#!/usr/bin/env bash
set -e
cd /home/z/my-project
exec node node_modules/.bin/next dev -p 3000 -H 0.0.0.0
