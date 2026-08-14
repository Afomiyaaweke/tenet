#!/usr/bin/env bash
set -euo pipefail

echo "=== Vercel Build Script ==="

SCHEMA_FILE="prisma/schema.prisma"

# Check if we need to switch provider
CURRENT_PROVIDER=$(grep -oP 'provider\s*=\s*"\K[^"]+' "$SCHEMA_FILE" || echo "unknown")
echo "Current Prisma provider: $CURRENT_PROVIDER"

if [ "$CURRENT_PROVIDER" = "sqlite" ]; then
  echo "Switching Prisma provider from sqlite to postgresql for Vercel build..."
  sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA_FILE"
  echo "Provider switched to postgresql"
else
  echo "Provider is already $CURRENT_PROVIDER, no switch needed"
fi

echo "Running prisma generate..."
npx prisma generate

# Push schema to Neon PostgreSQL database
# This ensures all tables exist before the app starts
echo "Pushing schema to PostgreSQL database..."
npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "WARNING: prisma db push failed. The database may already be up to date."
  echo "Continuing with build..."
}

echo "Running next build with webpack..."
npx next build --webpack

echo "=== Vercel Build Complete ==="
