#!/bin/bash

# Build script for RISC Zero Dilithium zkVM project

set -e

echo "Building RISC Zero Dilithium zkVM project..."

# Set environment variables
export PATH="$HOME/.cargo/bin:$PATH"
export PATH="$HOME/.risc0/bin:$PATH"

# Build the wallet CLI
echo "Building wallet CLI..."
cd wallet
cargo build --release
cd ..

# Build the zkVM project
echo "Building zkVM project..."
cargo build --release

# Build the host binary
echo "Building host binary..."
cd host
cargo build --release
cd ..

# Install Node.js dependencies for the service
echo "Installing Node.js dependencies..."
cd zkvm-service
npm install
cd ..

echo "Build completed successfully!"
echo ""
echo "Usage:"
echo "1. Generate keys: ./target/release/dilithium-wallet keygen -o keypair.json"
echo "2. Sign message: ./target/release/dilithium-wallet sign -k keypair.json -m 'Hello' -o signature.bin"
echo "3. Generate proof: ./target/release/host verify --public-key pk.bin --signature sig.bin --message 'Hello' --output receipt.bin"
echo "4. Start service: cd zkvm-service && npm start"