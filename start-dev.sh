#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..." >> /home/z/my-project/dev-watchdog.log
  NODE_OPTIONS="--max-old-space-size=384" node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
  EXIT=$?
  echo "[$(date)] Server exited ($EXIT), restarting in 3s..." >> /home/z/my-project/dev-watchdog.log
  sleep 3
  # Trim log if too large
  if [ -f /home/z/my-project/dev.log ] && [ $(wc -c < /home/z/my-project/dev.log) -gt 524288 ]; then
    tail -50 /home/z/my-project/dev.log > /tmp/dev-log-trimmed.txt
    mv /tmp/dev-log-trimmed.txt /home/z/my-project/dev.log
  fi
done
