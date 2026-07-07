#!/bin/bash
cd /home/z/my-project
while true; do
  node .next/standalone/server.js 2>&1
  echo "[$(date)] Server exited, restarting in 2s..." >> /home/z/my-project/server-restart.log
  sleep 2
done
