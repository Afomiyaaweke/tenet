#!/usr/bin/env bash
set -euo pipefail

echo "=== Vercel Build Script ==="

# ── Resolve DATABASE_URL from Neon integration vars ──
# Vercel's Neon integration prefixes env vars with the project name (e.g. tenet_)
# Prisma expects DATABASE_URL, so we resolve it here.
if [ -z "${DATABASE_URL:-}" ] || [ "$DATABASE_URL" = "postgresql://postgres:[YOUR-PASSWORD]@db.vnsxddafswwtzalmzqju.supabase.co:5432/postgres" ]; then
  # Try Neon integration vars in order of preference
  if [ -n "${tenet_POSTGRES_PRISMA_URL:-}" ]; then
    export DATABASE_URL="$tenet_POSTGRES_PRISMA_URL"
    echo "Using tenet_POSTGRES_PRISMA_URL for DATABASE_URL"
  elif [ -n "${tenet_DATABASE_URL:-}" ]; then
    export DATABASE_URL="$tenet_DATABASE_URL"
    echo "Using tenet_DATABASE_URL for DATABASE_URL"
  elif [ -n "${tenet_POSTGRES_URL:-}" ]; then
    export DATABASE_URL="$tenet_POSTGRES_URL"
    echo "Using tenet_POSTGRES_URL for DATABASE_URL"
  else
    echo "WARNING: No valid DATABASE_URL found. Build may fail."
  fi
else
  echo "Using existing DATABASE_URL"
fi

echo "DATABASE_URL is set (length: ${#DATABASE_URL})"

# ── Generate Prisma Client ──
echo "Running prisma generate..."
npx prisma generate

# ── Push schema to database (creates tables if they don't exist) ──
echo "Running prisma db push..."
npx prisma db push --accept-data-loss 2>&1 || {
  echo "WARNING: prisma db push failed (tables may already exist or DB unreachable)"
  echo "Continuing build anyway..."
}

# ── Build Next.js ──
echo "Running next build..."
npx next build
