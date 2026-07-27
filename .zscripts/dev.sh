#!/bin/bash
# Custom dev script for TenetBid — Production-Ready for 2000 Users
# This is executed by the sandbox's boot script (/start.sh)
# The boot script runs this in a background subshell:
#   (sudo -u z bash dev.sh) &
#
# Strategy for this memory-constrained sandbox:
# 1. Build production bundle first (more memory-efficient than dev server)
# 2. Use 'next start' instead of 'next dev' (production server uses much less memory)
# 3. Auto-restart loop to keep server alive when it periodically dies

cd /home/z/my-project

# Trap signals so we can log what kills the server
trap 'echo "[DEV] Received signal, shutting down..."; exit 0' SIGTERM SIGINT SIGHUP

# Kill any existing process on port 3000
fuser -k 3000/tcp 2>/dev/null
sleep 2

# Generate PostgreSQL Prisma client for TypeScript compatibility
# (mode: 'insensitive' is only in PostgreSQL client types)
echo "[DEV] Generating Prisma client..."
prisma generate --schema=prisma/schema.prod.prisma 2>&1 || true

# Push dev schema (SQLite) for local database
echo "[DEV] Setting up database..."
bun run db:push 2>&1 || true

# Build production bundle (more memory-efficient at runtime)
echo "[DEV] Building production bundle..."
NODE_OPTIONS="--max-old-space-size=768" node_modules/.bin/next build 2>&1 | tail -5

# Auto-restart loop: use production server (next start) which uses less memory
RESTART_COUNT=0
MAX_RESTARTS=50

while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
  echo "[DEV] Starting production server (attempt $((RESTART_COUNT + 1))/$MAX_RESTARTS)..."
  fuser -k 3000/tcp 2>/dev/null
  sleep 1
  NODE_OPTIONS="--max-old-space-size=256" node_modules/.bin/next start -p 3000 -H 0.0.0.0 2>&1 | tee /home/z/my-project/dev.log
  EXIT_CODE=${PIPESTATUS[0]}
  echo "[DEV] Server exited with code $EXIT_CODE"
  RESTART_COUNT=$((RESTART_COUNT + 1))

  if [ $RESTART_COUNT -lt $MAX_RESTARTS ]; then
    echo "[DEV] Waiting 5 seconds before restarting..."
    sleep 5
  fi
done

echo "[DEV] Max restarts reached ($MAX_RESTARTS), exiting."
