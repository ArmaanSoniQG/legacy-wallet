use risc0_zkvm::guest::env;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use crystals_dilithium::{Dilithium5, PublicKey, Signature};

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
    
    // REAL Dilithium-5 verification inside zkVM using crystals-dilithium
    let is_valid = if input.public_key.len() == Dilithium5::PUBLIC_KEY_SIZE && 
                      input.signature.len() == Dilithium5::SIGNATURE_SIZE {
        
        // Parse public key and signature
        let mut pk_bytes = [0u8; Dilithium5::PUBLIC_KEY_SIZE];
        pk_bytes.copy_from_slice(&input.public_key);
        let public_key = PublicKey::from_bytes(&pk_bytes);
        
        let mut sig_bytes = [0u8; Dilithium5::SIGNATURE_SIZE];
        sig_bytes.copy_from_slice(&input.signature);
        let signature = Signature::from_bytes(&sig_bytes);
        
        // REAL Dilithium-5 verification
        Dilithium5::verify(&public_key, &input.message, &signature)
    } else {
        false
    };
    
    // Hash public key for on-chain verification
    let mut pk_hasher = Sha256::new();
    pk_hasher.update(&input.public_key);
    let public_key_hash = pk_hasher.finalize().into();
    
    // Handle message hash
    let message_hash = if input.message.len() == 32 {
        let mut hash_array = [0u8; 32];
        hash_array.copy_from_slice(&input.message);
        hash_array
    } else {
        let mut msg_hasher = Sha256::new();
        msg_hasher.update(&input.message);
        msg_hasher.finalize().into()
    };
    
    // Only commit if verification passed - this is REAL verification
    if is_valid {
        // Commit the message hash for smart contract verification
        env::commit(&message_hash);
        
        let output = VerificationOutput {
            is_valid: true,
            public_key_hash,
            message_hash,
        };
        env::commit(&output);
    } else {
        // Commit failure state
        let output = VerificationOutput {
            is_valid: false,
            public_key_hash,
            message_hash: [0u8; 32],
        };
        env::commit(&output);
    }
}