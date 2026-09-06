#!/bin/bash
# Custom dev script for TenetBid
# Executed by the sandbox's boot script (/start.sh) as:
#   ( sudo -u z bash dev.sh ) &
#
# KEY INSIGHT: Background processes die in this sandbox unless they are
# direct children of PID 1 (tini). Using 'bash -c "... & disown"' forces
# the parent bash to exit quickly, allowing tini to adopt the orphaned
# process. Direct children of tini stay alive indefinitely.
#
# NOTE: We use the dev server (bun run dev) instead of production (next start)
# because Next.js 16 has a build bug where a page component chunk is
# referenced in the RSC payload but not written to disk, causing a 500 error
# and client-side hydration failure. The dev server generates chunks on demand
# and works correctly.

cd /home/z/my-project

# Trap signals so we can log what kills the server
trap 'echo "[DEV] Received signal, shutting down..."; exit 0' SIGTERM SIGINT SIGHUP

# Kill any existing process on port 3000
fuser -k 3000/tcp 2>/dev/null
sleep 2

# Ensure dependencies are installed (node_modules may be missing)
echo "[DEV] Installing dependencies..."
bun install 2>&1 || true

# Push dev schema (SQLite) for local database
echo "[DEV] Setting up database..."
bun run db:push 2>&1 || true

# Seed the dev DB with the known test accounts (idempotent).
# The sandbox periodically wipes the SQLite DB — this guarantees
# personal@tenetbid.com / test@tenetbid.com always exist after a restart.
if [ -f "/home/z/my-project/scripts/seed-dev.cjs" ]; then
  echo "[DEV] Seeding dev accounts..."
  node scripts/seed-dev.cjs 2>&1 | tail -5 || true
fi

# Auto-restart loop: start dev server using the disown pattern
# that makes it a direct child of tini (PID 1)
RESTART_COUNT=0
MAX_RESTARTS=100

while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
  echo "[DEV] Starting dev server (attempt $((RESTART_COUNT + 1))/$MAX_RESTARTS)..."

  # Kill any existing process on port 3000
  fuser -k 3000/tcp 2>/dev/null
  sleep 2

  # Re-install deps if next binary is missing (can happen after crashes)
  if [ ! -f "/home/z/my-project/node_modules/.bin/next" ]; then
    echo "[DEV] next binary missing, reinstalling..."
    bun install 2>&1 || true
  fi

  # Start the dev server using the disown pattern
  # bash -c creates a subshell that starts the server in background and disowns it
  # When the subshell exits, the server becomes orphaned and is adopted by tini (PID 1)
  # This is the ONLY way to keep background processes alive in this sandbox
  bash -c 'nohup env NODE_OPTIONS="--max-old-space-size=512" bun run dev >> /home/z/my-project/dev.log 2>&1 & disown'

  # Wait for the server to start
  sleep 5

  # Check if the server is still alive
  if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "[DEV] Server is running and responding."
    # Server is alive - monitor it periodically
    while true; do
      sleep 30
      if ! curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
        echo "[DEV] Server died, will restart..."
        break
      fi
    done
  else
    echo "[DEV] Server failed to start or died immediately."
  fi

  RESTART_COUNT=$((RESTART_COUNT + 1))

  if [ $RESTART_COUNT -lt $MAX_RESTARTS ]; then
    echo "[DEV] Waiting 3 seconds before restarting..."
    sleep 3
  fi
done

echo "[DEV] Max restarts reached ($MAX_RESTARTS), exiting."
