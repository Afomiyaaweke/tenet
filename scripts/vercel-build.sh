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

echo "Running next build with webpack..."
npx next build --webpack

echo "=== Vercel Build Complete ==="
