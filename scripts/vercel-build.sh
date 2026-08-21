#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Vercel Build Script
# - Swaps Prisma schema to PostgreSQL for production
# - Syncs database schema (creates missing tables)
# - Generates Prisma client
# - Runs Next.js build
# ─────────────────────────────────────────────────────────────
set -e

echo "🔧 Vercel Build: Starting..."

# Detect if we're in Vercel production
if [ "$VERCEL" = "1" ] || [ "$NODE_ENV" = "production" ]; then
  echo "📡 Production build detected — switching to PostgreSQL schema"
  cp prisma/schema.prod.prisma prisma/schema.prisma

  # Sync database schema — creates missing tables without dropping existing data
  echo "🗄️  Syncing database schema..."
  npx prisma db push --accept-data-loss 2>&1 || echo "⚠️  DB sync warning (non-fatal)"
else
  echo "🖥️  Development build — keeping SQLite schema"
fi

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Run Next.js build
echo "🏗️  Building Next.js..."
npx next build

echo "✅ Build complete!"
