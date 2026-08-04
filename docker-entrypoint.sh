#!/bin/bash
set -e

echo "🚀 Starting TenetBid — Transforming Procurement Through Technology..."

if [ ! -f ./db/custom.db ]; then
  echo "⚠️ Database not found — falling back to runtime init..."
  mkdir -p ./db
  timeout 60 ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss
  timeout 60 bun run prisma/seed.ts
else
  echo "✅ Database found (baked into image)."
fi

echo "🌐 Starting server..."
exec bun server.js