#!/bin/bash
# Start both services persistently
cd /home/armaan/qs/legacy-wallet
nohup node server/real-flow.js > logs/backend-persistent.log 2>&1 &
cd qsafe-ui && nohup npm run dev > ../logs/frontend-persistent.log 2>&1 &
echo "Services started - Backend: 8787, Frontend: 5173"
