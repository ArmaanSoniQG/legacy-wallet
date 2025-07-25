use risc0_zkvm::guest::env;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

// Import our Dilithium module
mod dilithium;

#[derive(Serialize, Deserialize)]
struct VerificationInput {
    public_key: Vec<u8>,  // 2592 bytes for Dilithium-5
    signature: Vec<u8>,   // 4627 bytes for Dilithium-5
    message: Vec<u8>,     // The message that was signed
    nonce: u64,           // Optional nonce for uniqueness
}

#[derive(Serialize, Deserialize)]
struct VerificationOutput {
    is_valid: bool,
    public_key_hash: [u8; 32], // Hash of the public key for on-chain verification
    message_hash: [u8; 32],    // Hash of the verified message
}

fn main() {
    // Read the verification input
    let input: VerificationInput = env::read();
    
    // Verify the Dilithium signature
    let is_valid = dilithium::verify(&input.public_key, &input.message, &input.signature);
    
    // Calculate SHA-256 hash of the public key for on-chain verification
    let mut pk_hasher = Sha256::new();
    pk_hasher.update(&input.public_key);
    let public_key_hash = pk_hasher.finalize().into();
    
    // Calculate SHA-256 hash of the message
    let mut msg_hasher = Sha256::new();
    msg_hasher.update(&input.message);
    let message_hash = msg_hasher.finalize().into();
    
    // Create and commit the verification result
    let output = VerificationOutput {
        is_valid,
        public_key_hash,
        message_hash,
    };
    
    // Write the verification result to the journal
    env::commit(&output);
}