#!/usr/bin/env bash
set -euo pipefail

echo "=== Vercel Build Script ==="

echo "Running prisma generate..."
npx prisma generate

echo "Running next build with webpack..."
npx next build --webpack

echo "=== Vercel Build Complete ==="
