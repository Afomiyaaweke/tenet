#!/bin/bash
cd /home/z/my-project
while true; do
  node .next/standalone/server.js 2>>/home/z/my-project/prod.log &
  SERVER_PID=$!
  
  # Wait for server to be ready
  for i in $(seq 1 10); do
    sleep 1
    if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
      break
    fi
  done
  
  # Wait for the server to die
  while kill -0 $SERVER_PID 2>/dev/null; do
    sleep 1
  done
  
  echo "[$(date)] Server died, restarting..." >> /home/z/my-project/watchdog.log
  sleep 1
done
