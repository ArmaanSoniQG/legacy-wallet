#!/bin/bash
# Quick validation script (can paste into Codespace shell)

# Sanity: show config
boundless config

# Encode a tiny dummy input (after your UI gives you a real signed payload)
echo '{"legacy_addr":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],"new_pq_key":"","msg":"","sig65":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,27],"nonce":1}' > input.json
cargo run -p tools-encode-input < input.json

# Submit (replace CIDs/IDs)
RUST_LOG=info boundless request submit-offer offer.yaml \
  --program-url "https://dweb.link/ipfs/<YOUR_GUEST_CID>" \
  --input-file input.bin --wait

# Retrieve proof + local verify
boundless request get-proof <REQUEST_ID>
boundless request verify-proof <REQUEST_ID> 0x<YOUR_IMAGE_ID_HEX>