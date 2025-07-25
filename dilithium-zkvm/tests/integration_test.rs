use methods::{DILITHIUM_VERIFIER_ELF, DILITHIUM_VERIFIER_ID};
use risc0_zkvm::{default_prover, ExecutorEnv};
use serde::{Deserialize, Serialize};
use crystals_dilithium::{dilithium5, KeyPair, PublicKey, SecretKey, Signature};

#[derive(Serialize, Deserialize)]
struct VerificationInput {
    public_key: Vec<u8>,
    signature: Vec<u8>,
    message: Vec<u8>,
}

#[derive(Serialize, Deserialize, Debug)]
struct VerificationOutput {
    is_valid: bool,
    public_key_hash: [u8; 32],
}

#[test]
fn test_dilithium_verification() {
    // Generate a Dilithium-5 key pair
    let keypair = dilithium5::keypair();
    let public_key = keypair.public;
    let secret_key = keypair.secret;
    
    // Create a test message
    let message = b"Test message for Dilithium verification".to_vec();
    
    // Sign the message
    let signature = dilithium5::sign(&secret_key, &message);
    
    // Prepare the verification input
    let input = VerificationInput {
        public_key: public_key.as_bytes().to_vec(),
        signature: signature.as_bytes().to_vec(),
        message: message.clone(),
    };
    
    // Create the zkVM environment
    let env = ExecutorEnv::builder()
        .write(&input)
        .unwrap()
        .build()
        .unwrap();
    
    // Generate the proof
    let prover = default_prover();
    let prove_result = prover.prove(env, DILITHIUM_VERIFIER_ELF).unwrap();
    
    // Extract and verify the receipt
    let receipt = prove_result.receipt;
    receipt.verify(DILITHIUM_VERIFIER_ID).unwrap();
    
    // Decode the journal
    let verification_result: VerificationOutput = receipt.journal.decode().unwrap();
    
    // Check that the signature was verified successfully
    assert!(verification_result.is_valid, "Signature verification failed");
    
    // Test with tampered message (should fail verification)
    let tampered_message = b"Tampered message for Dilithium verification".to_vec();
    
    let tampered_input = VerificationInput {
        public_key: public_key.as_bytes().to_vec(),
        signature: signature.as_bytes().to_vec(),
        message: tampered_message,
    };
    
    let env = ExecutorEnv::builder()
        .write(&tampered_input)
        .unwrap()
        .build()
        .unwrap();
    
    let prove_result = prover.prove(env, DILITHIUM_VERIFIER_ELF).unwrap();
    let receipt = prove_result.receipt;
    receipt.verify(DILITHIUM_VERIFIER_ID).unwrap();
    
    let verification_result: VerificationOutput = receipt.journal.decode().unwrap();
    
    // Check that the tampered message fails verification
    assert!(!verification_result.is_valid, "Tampered message should fail verification");
}