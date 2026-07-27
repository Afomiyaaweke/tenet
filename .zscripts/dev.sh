#!/bin/bash
# Custom dev script for TenetBid
# This is executed by the sandbox's boot script (/start.sh)
# The boot script runs this in a background subshell:
#   (sudo -u z bash dev.sh) &
#
# The server process dies periodically in this sandbox environment
# (likely due to memory/cgroup constraints). This script includes
# an auto-restart loop to keep the server alive.

cd /home/z/my-project

# Trap signals so we can log what kills the server
trap 'echo "[DEV] Received signal, shutting down..."; exit 0' SIGTERM SIGINT SIGHUP

# Kill any existing process on port 3000
fuser -k 3000/tcp 2>/dev/null
sleep 2

# Run prisma setup first
echo "[DEV] Setting up database..."
bun run db:push 2>&1 || true

echo "[DEV] Starting Next.js development server with auto-restart..."

# Auto-restart loop: if the server dies, restart it after a short delay
RESTART_COUNT=0
MAX_RESTARTS=50

while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
  echo "[DEV] Starting server (attempt $((RESTART_COUNT + 1))/$MAX_RESTARTS)..."
  NODE_OPTIONS="--max-old-space-size=512" bun run dev 2>&1 | tee /home/z/my-project/dev.log
  EXIT_CODE=${PIPESTATUS[0]}
  echo "[DEV] Server exited with code $EXIT_CODE"
  RESTART_COUNT=$((RESTART_COUNT + 1))

  if [ $RESTART_COUNT -lt $MAX_RESTARTS ]; then
    echo "[DEV] Waiting 5 seconds before restarting..."
    sleep 5
    fuser -k 3000/tcp 2>/dev/null
    sleep 1
  fi
done

echo "[DEV] Max restarts reached ($MAX_RESTARTS), exiting."
