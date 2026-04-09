#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/next/dist/bin/next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
  sleep 2
done
