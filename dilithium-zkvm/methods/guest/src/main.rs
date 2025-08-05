use risc0_zkvm::guest::env;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Serialize, Deserialize)]
struct VerificationInput {
    public_key: Vec<u8>,
    signature: Vec<u8>,
    message: Vec<u8>,
    nonce: u64,
}

#[derive(Serialize, Deserialize)]
struct VerificationOutput {
    is_valid: bool,
    public_key_hash: [u8; 32],
    message_hash: [u8; 32],
}

fn main() {
    let input: VerificationInput = env::read();
    
    // For now, assume signature is valid if lengths are correct
    // Real Dilithium verification would happen here
    let is_valid = input.public_key.len() == 2592 && 
                   input.signature.len() > 0 && 
                   input.message.len() > 0;
    
    // Hash public key for on-chain verification
    let mut pk_hasher = Sha256::new();
    pk_hasher.update(&input.public_key);
    let public_key_hash = pk_hasher.finalize().into();
    
    // Handle message hash - if it's already a 32-byte hash, use it directly
    let message_hash = if input.message.len() == 32 {
        // Message is already a hash (32 bytes)
        let mut hash_array = [0u8; 32];
        hash_array.copy_from_slice(&input.message);
        hash_array
    } else {
        // Hash the message
        let mut msg_hasher = Sha256::new();
        msg_hasher.update(&input.message);
        msg_hasher.finalize().into()
    };
    
    // For smart contract compatibility, commit the message hash directly
    // This makes it easy for the contract to extract it from journal[0:32]
    env::commit(&message_hash);
    
    // Also commit the full output for debugging (optional)
    let output = VerificationOutput {
        is_valid,
        public_key_hash,
        message_hash,
    };
    env::commit(&output);
}