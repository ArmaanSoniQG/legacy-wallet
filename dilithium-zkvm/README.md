# RISC Zero Dilithium zkVM Integration

Replace hybrid verification with trustless RISC Zero zkVM proofs for your post-quantum wallet.

## Quick Start

```bash
# Build everything
./build.sh

# Generate Dilithium keys
./target/release/dilithium-wallet keygen -o keypair.json
./target/release/dilithium-wallet export-pk -k keypair.json -o public_key.bin

# Generate ZK proof
cd host && cargo run --release -- verify \
  --public-key ../public_key.bin \
  --signature ../public_key.bin \
  --message "Hello World" \
  --output ../receipt.bin

# Start zkVM service
cd zkvm-service && node server.js
```

## Integration with Existing UI

Replace `RealDilithiumVerification.jsx` with `integration/RiscZeroVerification.jsx`:

```jsx
import RiscZeroVerification from './integration/RiscZeroVerification';

// In your component
<RiscZeroVerification 
  signer={signer}
  publicKey={publicKeyHex}
  signature={signatureHex}
  message={message}
/>
```

## Test the Integration

Open the test page in your browser:
```
http://localhost:3001/
```

Or try the test HTML page:
```
integration/test.html
```

## Architecture

1. **Guest Code** (`methods/guest/`): Dilithium verification in zkVM
2. **Host Code** (`host/`): Generates ZK proofs
3. **Wallet CLI** (`wallet/`): Key generation and signing
4. **Service** (`zkvm-service/`): Node.js bridge for React UI
5. **Integration** (`integration/`): React component for existing UI

## Workflow

1. User generates Dilithium keys with wallet CLI
2. User signs messages with private key
3. React UI calls zkVM service with signature data
4. Service generates RISC Zero proof of verification
5. UI submits proof to existing smart contract
6. Contract verifies proof and executes transaction

This maintains your existing UI/UX while making verification truly trustless.