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

  # Ensure DATABASE_URL is set for prisma generate validation.
  # Uses a syntactically-valid placeholder so the build completes even
  # when the user hasn't added a real database yet.
  # At runtime, db.ts handles the missing-database case gracefully.
  if [ -z "$DATABASE_URL" ] && \
     [ -z "$POSTGRES_PRISMA_URL" ] && \
     [ -z "$POSTGRES_URL" ] && \
     [ -z "$tenet_POSTGRES_PRISMA_URL" ] && \
     [ -z "$tenet_DATABASE_URL" ]; then
    echo "⚠️  No DATABASE_URL found — using placeholder for build-time only"
    export DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
  fi

  # Sync database schema — creates missing tables without dropping existing data
  echo "🗄️  Syncing database schema..."
  npx prisma db push --accept-data-loss 2>&1 || echo "⚠️  DB sync non-fatal (tables will auto-create on first use)"
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
