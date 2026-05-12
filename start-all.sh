#!/bin/bash
# Afomiya Tender Ecosystem - Service Starter
# Starts both the Next.js dev server and Chat WebSocket service

# Kill any existing processes
pkill -f "next dev" 2>/dev/null
pkill -f "chat-service" 2>/dev/null
sleep 2
rm -rf /home/z/my-project/.next/dev/lock 2>/dev/null

# Start chat WebSocket service on port 3003
cd /home/z/my-project/mini-services/chat-service
bun run dev &
CHAT_PID=$!

# Start Next.js dev server on port 3000 using bun
cd /home/z/my-project
bun node_modules/.bin/next dev -p 3000 &
NEXT_PID=$!

# Wait for both to be ready
sleep 5

echo "======================================"
echo "Afomiya Tender Ecosystem"
echo "======================================"
echo "Chat service PID: $CHAT_PID (port 3003)"
echo "Next.js PID: $NEXT_PID (port 3000)"
echo "Both services started!"
echo "======================================"

# Keep the script running
wait
