#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=512" npx next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server died, restarting in 1s..." >> /home/z/my-project/dev-watchdog.log
  sleep 1
done
