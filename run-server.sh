#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..." >> /home/z/my-project/dev-watchdog.log
  NODE_OPTIONS="--max-old-space-size=512" npx next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
  EXIT=$?
  echo "[$(date)] Server exited ($EXIT), restarting in 2s..." >> /home/z/my-project/dev-watchdog.log
  sleep 2
  if [ -f /home/z/my-project/dev.log ] && [ $(wc -c < /home/z/my-project/dev.log) -gt 524288 ]; then
    tail -50 /home/z/my-project/dev.log > /tmp/dev-log-trimmed.txt
    mv /tmp/dev-log-trimmed.txt /home/z/my-project/dev.log
  fi
done
