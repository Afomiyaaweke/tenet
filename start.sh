#!/bin/bash
# Tenets Development Server Startup Script
# Handles the memory-constrained sandbox environment

cd /home/z/my-project

# Make sure port 3000 is free
fuser -k 3000/tcp 2>/dev/null
sleep 1

# Start the dev server
echo "Starting Tenets dev server..."
NODE_OPTIONS="--max-old-space-size=512" npx next dev -p 3000 2>&1 | tee /home/z/my-project/dev.log &
SERVER_PID=$!

# Wait for server to be ready
for i in $(seq 1 30); do
  sleep 2
  if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "Server is ready!"
    break
  fi
done

# Keep the script running
wait $SERVER_PID 2>/dev/null
EXIT_CODE=$?
echo "Server exited with code $EXIT_CODE"
exit $EXIT_CODE
