#!/bin/bash
cd /home/z/my-project

# Kill any existing process on port 3000
fuser -k 3000/tcp 2>/dev/null
sleep 2

# Start the production server and keep it running
# This script itself runs as a persistent process
export NODE_OPTIONS="--max-old-space-size=256"
while true; do
  echo "Starting Next.js production server..."
  node_modules/.bin/next start -p 3000 -H 0.0.0.0 2>&1 | tee /home/z/my-project/dev.log
  echo "Server exited, restarting in 5 seconds..."
  sleep 5
done
