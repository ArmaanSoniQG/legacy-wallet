#!/bin/bash
echo "Starting Quantum-Safe Wallet UI..."
python3 -m http.server 8080 &
echo "UI available at: http://localhost:8080"
echo "Press Ctrl+C to stop the server"