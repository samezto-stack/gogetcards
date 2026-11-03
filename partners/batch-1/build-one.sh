#!/bin/bash
# Build one site, run its production build, boot it and probe every route.
set -e
slug=$1; port=${2:-4200}
cd /home/user/batch1
python3 make-site.py specs/$slug.json >/dev/null
cd $slug && ln -sf /home/user/business-plan/node_modules node_modules
npx tsc --noEmit -p . 2>&1 | head -5
out=$(npm run build 2>&1) || { echo "$out" | grep -E "FAIL|rror" | head; exit 1; }
echo "$out" | grep -E "FAIL|check\(s\)" || true
svc=$(python3 -c "import json;print(json.load(open('../specs/$slug.json'))['serviceSlug'])")
PORT=$port NODE_ENV=production node server.js >/tmp/$slug.log 2>&1 & pid=$!
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null localhost:$port/ && break; sleep 0.5; done
bad=""
for p in $(grep -o "^  '/[a-z/-]*'" server/seo.js | tr -d " '"); do c=$(curl -s -o /dev/null -w '%{http_code}' localhost:$port$p); [ "$c" = 200 ] || bad="$bad $p=$c"; done
t=$(curl -s localhost:$port/services/$svc | grep -o '<title>[^<]*</title>')
kill $pid
[ -z "$bad" ] && echo "$slug: build ok, all routes 200 · $t" || { echo "$slug: BAD$bad"; exit 1; }
