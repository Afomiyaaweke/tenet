#!/bin/bash
set -e

echo "🚀 Starting TenetBid — Transforming Procurement Through Technology..."
echo "🔍 DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo yes || echo NO)"
echo "🔍 NODE_ENV: $NODE_ENV"
echo "🔍 PORT: $PORT"
ls -la ./db 2>&1 || echo "⚠️ ./db directory missing"

if [ ! -f ./db/custom.db ]; then
  echo "⚠️ Database not found — falling back to runtime init..."
  mkdir -p ./db
  timeout 60 bunx prisma db push --skip-generate --accept-data-loss
  timeout 60 bun run prisma/seed.ts
else
  echo "✅ Database found (baked into image)."
fi

echo "🌐 Starting server..."
exec bun server.js