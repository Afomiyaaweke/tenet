#!/bin/bash
set -e

echo "🚀 Starting TenetBid — Transforming Procurement Through Technology..."

if [ ! -f ./db/custom.db ]; then
  echo "⚠️  Database not found in image — this shouldn't happen in production."
  echo "⚠️  Falling back to runtime initialization (may be slow)..."
  mkdir -p ./db
  timeout 60 bunx prisma db push --skip-generate --accept-data-loss
  timeout 60 bun run prisma/seed.ts
else
  echo "✅ Database found (baked into image)."
fi

echo "🌐 Starting TenetBid server on port 3000..."
exec bun server.js