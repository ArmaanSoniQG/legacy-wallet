use methods::{DILITHIUM_VERIFIER_ELF, DILITHIUM_VERIFIER_ID};
use risc0_zkvm::{default_prover, ExecutorEnv, Receipt};
use bonsai_sdk::alpha as bonsai_sdk;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use clap::{Parser, Subcommand};
use sha2::{Digest, Sha256};
use pqcrypto_dilithium::dilithium5::*;
use pqcrypto_traits::sign::{PublicKey, SecretKey, SignedMessage};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    GenerateKeypair,
    Sign {
        #[arg(short = 'k', long)]
        private_key: PathBuf,
        #[arg(short, long)]
        message: String,
        #[arg(short, long)]
        output: PathBuf,
    },
    Verify {
        #[arg(short, long)]
        public_key: PathBuf,
        #[arg(short, long)]
        signature: PathBuf,
        #[arg(short, long)]
        message: String,
        #[arg(short, long)]
        output: PathBuf,
    },
    VerifyNative {
        #[arg(short, long)]
        public_key: PathBuf,
        #[arg(short, long)]
        signature: PathBuf,
        #[arg(short, long)]
        message: String,
    },
    Extract {
        #[arg(short, long)]
        receipt: PathBuf,
        #[arg(short, long, default_value = "json")]
        format: String,
    },
}

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

#[tokio::main]
async fn main() {
    let args = Args::parse();

    match args.command {
        Commands::GenerateKeypair => {
            println!("Generating REAL Dilithium-5 key pair...");
            
            // Generate REAL Dilithium-5 key pair
            let (public_key, secret_key) = keypair();
            
            // Write keys to files
            fs::write("private_key.bin", secret_key.as_bytes()).expect("Failed to write private key");
            fs::write("public_key.bin", public_key.as_bytes()).expect("Failed to write public key");
            
            // Calculate hash of public key
            let mut hasher = Sha256::new();
            hasher.update(public_key.as_bytes());
            let hash = hasher.finalize();
            
            println!("✅ REAL Dilithium-5 key pair generated!");
            println!("Private key: private_key.bin");
            println!("Public key: public_key.bin");
            println!("Public key hash: {}", hex::encode(hash));
        }
        
        Commands::Sign { private_key, message, output } => {
            println!("Signing with REAL Dilithium-5...");
            
            let secret_key_bytes = fs::read(&private_key).expect("Failed to read private key");
            let secret_key = SecretKey::from_bytes(&secret_key_bytes).expect("Invalid private key");
            
            // Sign with REAL Dilithium-5
            let signed_message = sign(message.as_bytes(), &secret_key);
            
            fs::write(&output, signed_message.as_bytes()).expect("Failed to write signature");
            
            println!("✅ Message signed with REAL Dilithium-5!");
            println!("Signature saved to: {}", output.display());
        }
        
        Commands::Verify { public_key, signature, message, output } => {
            println!("Verifying with REAL Dilithium-5 and generating zkVM proof...");
            
            let public_key_bytes = fs::read(&public_key).expect("Failed to read public key");
            let signature_bytes = fs::read(&signature).expect("Failed to read signature");
            let message_bytes = message.as_bytes().to_vec();
            
            // Verify REAL Dilithium-5 signature
            let public_key_obj = PublicKey::from_bytes(&public_key_bytes).expect("Invalid public key");
            let signed_message = SignedMessage::from_bytes(&signature_bytes).expect("Invalid signature");
            
            let verification_result = open(&signed_message, &public_key_obj);
            let is_valid = verification_result.is_ok();
            
            if is_valid {
                println!("✅ REAL Dilithium-5 signature is VALID!");
            } else {
                println!("❌ REAL Dilithium-5 signature is INVALID!");
            }
            
            // Handle hex-encoded transaction hashes
            let message_for_zkvm = if message.len() == 64 && message.chars().all(|c| c.is_ascii_hexdigit()) {
                // It's a hex-encoded hash, convert to bytes
                hex::decode(&message).expect("Invalid hex")
            } else {
                // It's a regular message
                message_bytes.clone()
            };
            
            // Create input for zkVM
            let input = VerificationInput {
                public_key: public_key_bytes.clone(),
                signature: signature_bytes,
                message: message_for_zkvm,
                nonce: 0,
            };
            
            // Generate zkVM proof via Bonsai
            let env = ExecutorEnv::builder()
                .write(&input)
                .unwrap()
                .build()
                .unwrap();
            
            let receipt = if let Ok(client) = bonsai_sdk::Client::from_env() {
                println!("🚀 Using Bonsai remote proving...");
                
                // Create Bonsai session
                let img_id = hex::encode(DILITHIUM_VERIFIER_ID);
                let input_data = bincode::serialize(&input).unwrap();
                
                let session = client.create_session(img_id, input_data, vec![]).await.unwrap();
                let session_id = session.uuid;
                
                // Poll for completion
                loop {
                    let status = client.session_status(session_id).await.unwrap();
                    match status.status.as_str() {
                        "SUCCEEDED" => {
                            println!("✅ Bonsai proof completed!");
                            break;
                        }
                        "RUNNING" => {
                            println!("⏳ Bonsai proving in progress...");
                            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                        }
                        "FAILED" => {
                            panic!("❌ Bonsai proving failed");
                        }
                        _ => {
                            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                        }
                    }
                }
                
                // Download receipt
                let receipt_data = client.session_receipt(session_id).await.unwrap();
                bincode::deserialize(&receipt_data).unwrap()
            } else {
                println!("⚠️  Bonsai not configured, using local proving...");
                let prover = default_prover();
                prover.prove(env, DILITHIUM_VERIFIER_ELF).unwrap().receipt
            };
            
            // Verify the receipt
            receipt.verify(DILITHIUM_VERIFIER_ID).unwrap();
            
            // Save receipt
            let receipt_bytes = bincode::serialize(&receipt.receipt).unwrap();
            fs::write(&output, &receipt_bytes).expect("Failed to write receipt");
            
            println!("✅ REAL zkVM proof generated and verified!");
            println!("Receipt saved to: {}", output.display());
        }
        
        Commands::VerifyNative { public_key, signature, message } => {
            println!("Native Dilithium-5 verification ONLY (no zkVM)...");
            let start_time = std::time::Instant::now();
            
            let public_key_bytes = fs::read(&public_key).expect("Failed to read public key");
            let signature_bytes = fs::read(&signature).expect("Failed to read signature");
            
            // Verify REAL Dilithium-5 signature (native only)
            let public_key_obj = PublicKey::from_bytes(&public_key_bytes).expect("Invalid public key");
            let signed_message = SignedMessage::from_bytes(&signature_bytes).expect("Invalid signature");
            
            let verification_result = open(&signed_message, &public_key_obj);
            let is_valid = verification_result.is_ok();
            let elapsed = start_time.elapsed();
            
            if is_valid {
                println!("✅ Native Dilithium-5 signature VALID in {:?}", elapsed);
                std::process::exit(0);
            } else {
                println!("❌ Native Dilithium-5 signature INVALID in {:?}", elapsed);
                std::process::exit(1);
            }
        }
        
        Commands::Extract { receipt, format } => {
            println!("Extracting verification data...");
            
            let receipt_bytes = fs::read(&receipt).expect("Failed to read receipt");
            let receipt: Receipt = bincode::deserialize(&receipt_bytes).unwrap();
            
            let output: VerificationOutput = receipt.journal.decode().unwrap();
            
            match format.as_str() {
                "json" => {
                    println!("{}", serde_json::to_string_pretty(&output).unwrap());
                }
                "hex" => {
                    println!("journal: {}", hex::encode(receipt.journal.bytes));
                    println!("seal: {}", hex::encode(bincode::serialize(&receipt.inner).unwrap()));
                }
                _ => {
                    eprintln!("Unknown format: {}", format);
                }
            }
        }
    }
}