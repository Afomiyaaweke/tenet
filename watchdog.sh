#!/bin/bash
while true; do
  cd /home/z/my-project
  echo "[$(date)] Starting Next.js dev server..." >> /home/z/my-project/watchdog.log
  npx next dev -p 3000 2>&1 | tee -a /home/z/my-project/dev.log
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> /home/z/my-project/watchdog.log
  sleep 3
done
