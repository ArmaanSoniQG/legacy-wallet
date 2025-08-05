#!/bin/bash

echo "🚀 Starting QuantaSeal Post-Quantum Wallet Services..."

# Build zkVM components
echo "📦 Building RISC Zero components..."
cd dilithium-zkvm
./build.sh
cd ..

# Start zkVM service
echo "🔧 Starting zkVM service on port 4000..."
cd dilithium-zkvm/zkvm-service
npm install
node server.js &
ZKVM_PID=$!
cd ../..

# Start UI
echo "🌐 Starting UI on port 5173..."
cd qsafe-ui
npm install
npm run dev &
UI_PID=$!
cd ..

echo "✅ Services started:"
echo "   - zkVM service: http://localhost:4000"
echo "   - UI: http://localhost:5173"
echo ""
echo "🔑 Workflow:"
echo "   1. Connect MetaMask to localhost:8545"
echo "   2. Generate Dilithium keys"
echo "   3. Register PQ key on-chain"
echo "   4. Send transactions with zkVM proof verification"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo '🛑 Stopping services...'; kill $ZKVM_PID $UI_PID; exit" INT
wait