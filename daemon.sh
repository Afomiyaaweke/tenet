#!/bin/bash
# Simple daemon that keeps the production server running
cd /home/z/my-project

while true; do
  node .next/standalone/server.js >> /home/z/my-project/dev.log 2>&1
  RETVAL=$?
  echo "[$(date)] Server exited with code $RETVAL, restarting in 2s..." >> /home/z/my-project/daemon.log
  sleep 2
done
