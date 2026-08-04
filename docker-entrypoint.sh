#!/bin/sh
set -e

echo "Starting application..."

# Fall back to the baked-in SQLite database if no DATABASE_URL was supplied
# at deploy time (e.g. no persistent volume/managed DB configured yet).
export DATABASE_URL="${DATABASE_URL:-file:./db/custom.db}"

echo "Applying database schema..."
bunx prisma db push --skip-generate --accept-data-loss

echo "Starting Next.js application..."
exec bun server.js