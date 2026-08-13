#!/usr/bin/env bash
set -euo pipefail

echo "=== Vercel Build Script ==="
echo "Switching Prisma provider from sqlite to postgresql for Vercel build..."

SCHEMA_FILE="prisma/schema.prisma"

# Switch provider from sqlite to postgresql
sed -i 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA_FILE"

echo "Prisma provider switched to postgresql"
echo "Running prisma generate..."

# Generate Prisma client with postgresql provider
npx prisma generate

echo "Running next build..."

# Build the Next.js app
npx next build --webpack

echo "=== Vercel Build Complete ==="
