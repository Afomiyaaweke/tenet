#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Vercel Build Script
# - Swaps Prisma schema to PostgreSQL for production
# - Generates Prisma client
# - Runs Next.js build
# ─────────────────────────────────────────────────────────────
set -e

echo "🔧 Vercel Build: Starting..."

# Detect if we're in Vercel production
if [ "$VERCEL" = "1" ] || [ "$NODE_ENV" = "production" ]; then
  echo "📡 Production build detected — switching to PostgreSQL schema"
  cp prisma/schema.prod.prisma prisma/schema.prisma
else
  echo "🖥️  Development build — keeping SQLite schema"
fi

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Run Next.js build (use npx to ensure command is found in PATH)
echo "🏗️  Building Next.js..."
npx next build

echo "✅ Build complete!"
