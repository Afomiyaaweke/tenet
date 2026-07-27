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
# Strategy:
# 1. Ensure dependencies are installed
# 2. Build production bundle (more memory-efficient at runtime)
# 3. Use 'next start' (production server) which uses less memory than dev
# 4. Start server as a direct child of tini using the disown pattern
# 5. Monitor and restart the server if it dies

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

# Build production bundle (more memory-efficient at runtime)
echo "[DEV] Building production bundle..."
NODE_OPTIONS="--max-old-space-size=768" npx next build 2>&1 | tail -5 || NODE_OPTIONS="--max-old-space-size=768" bun run build 2>&1 | tail -5 || true

# Auto-restart loop: start server using the disown pattern
# that makes it a direct child of tini (PID 1)
RESTART_COUNT=0
MAX_RESTARTS=100

while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
  echo "[DEV] Starting production server (attempt $((RESTART_COUNT + 1))/$MAX_RESTARTS)..."

  # Kill any existing process on port 3000
  fuser -k 3000/tcp 2>/dev/null
  sleep 2

  # Re-install deps if next binary is missing (can happen after crashes)
  if [ ! -f "/home/z/my-project/node_modules/.bin/next" ]; then
    echo "[DEV] next binary missing, reinstalling..."
    bun install 2>&1 || true
  fi

  # Start the server using the disown pattern
  # bash -c creates a subshell that starts the server in background and disowns it
  # When the subshell exits, the server becomes orphaned and is adopted by tini (PID 1)
  # This is the ONLY way to keep background processes alive in this sandbox
  bash -c 'nohup env NODE_OPTIONS="--max-old-space-size=256" /home/z/my-project/node_modules/.bin/next start -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1 & disown'

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
