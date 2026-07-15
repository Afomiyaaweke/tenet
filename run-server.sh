#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=384" node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server exited with $?, restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done
