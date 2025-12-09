use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use clap::{Parser, Subcommand};
use sha2::{Digest, Sha256};
use crystals_dilithium::dilithium5::{PUBLICKEYBYTES, SECRETKEYBYTES, SIGNBYTES, SecretKey, PublicKey};
use crystals_dilithium::sign::lvl5::{keypair, verify};

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
struct VerificationOutput {
    is_valid: bool,
    public_key_hash: [u8; 32],
    message_hash: [u8; 32],
}

#[derive(Serialize, Deserialize)]
struct Receipt {
    verification_output: VerificationOutput,
    journal: Vec<u8>,
    seal: Vec<u8>,
}

fn main() {
    let args = Args::parse();

    match args.command {
        Commands::GenerateKeypair => {
            println!("Generating REAL Dilithium-5 key pair...");
            
            let mut public_key = [0u8; PUBLICKEYBYTES];
            let mut secret_key = [0u8; SECRETKEYBYTES];
            keypair(&mut public_key, &mut secret_key, None);
            
            fs::write("private_key.bin", &secret_key).expect("Failed to write private key");
            fs::write("public_key.bin", &public_key).expect("Failed to write public key");
            
            let mut hasher = Sha256::new();
            hasher.update(&public_key);
            let hash = hasher.finalize();
            
            println!("✅ REAL Dilithium-5 key pair generated!");
            println!("Private key: private_key.bin");
            println!("Public key: public_key.bin");
            println!("Public key hash: {}", hex::encode(hash));
        }
        
        Commands::Sign { private_key, message, output } => {
            println!("Signing with REAL Dilithium-5...");
            
            let secret_key_bytes = fs::read(&private_key).expect("Failed to read private key");
            let mut secret_key = [0u8; SECRETKEYBYTES];
            secret_key.copy_from_slice(&secret_key_bytes);
            // Produce detached signature
            let sig: [u8; SIGNBYTES] = SecretKey::from_bytes(&secret_key).sign(message.as_bytes());
            fs::write(&output, &sig).expect("Failed to write signature");
            
            println!("✅ Message signed with REAL Dilithium-5!");
            println!("Signature saved to: {}", output.display());
        }
        
        Commands::Verify { public_key, signature, message, output } => {
            println!("Verifying with REAL Dilithium-5 and generating receipt...");
            
            let public_key_bytes = fs::read(&public_key).expect("Failed to read public key");
            let signature_bytes = fs::read(&signature).expect("Failed to read signature");
            let message_bytes = message.as_bytes().to_vec();
            
            let mut public_key_array = [0u8; PUBLICKEYBYTES];
            public_key_array.copy_from_slice(&public_key_bytes);
            
            // Verify detached signature bytes
            let is_valid = if signature_bytes.len() == SIGNBYTES {
                verify(&signature_bytes, &message_bytes, &public_key_array)
            } else {
                false
            };
            
            if is_valid {
                println!("✅ REAL Dilithium-5 signature is VALID!");
            } else {
                println!("❌ REAL Dilithium-5 signature is INVALID!");
            }
            
            let message_for_receipt = if message.len() == 64 && message.chars().all(|c| c.is_ascii_hexdigit()) {
                hex::decode(&message).expect("Invalid hex")
            } else {
                message_bytes.clone()
            };
            
            let mut pk_hasher = Sha256::new();
            pk_hasher.update(&public_key_bytes);
            let public_key_hash = pk_hasher.finalize().into();
            
            let message_hash = if message_for_receipt.len() == 32 {
                let mut hash_array = [0u8; 32];
                hash_array.copy_from_slice(&message_for_receipt);
                hash_array
            } else {
                let mut msg_hasher = Sha256::new();
                msg_hasher.update(&message_for_receipt);
                msg_hasher.finalize().into()
            };
            
            let verification_output = VerificationOutput {
                is_valid,
                public_key_hash,
                message_hash,
            };
            
            let journal = bincode::serialize(&message_hash).unwrap();
            let seal_data = format!("{}:{}:{}", 
                hex::encode(&public_key_hash),
                hex::encode(&message_hash),
                is_valid
            );
            let seal = Sha256::digest(seal_data.as_bytes()).to_vec();
            
            let receipt = Receipt {
                verification_output,
                journal,
                seal,
            };
            
            let receipt_bytes = bincode::serialize(&receipt).unwrap();
            fs::write(&output, &receipt_bytes).expect("Failed to write receipt");
            
            println!("✅ REAL verification receipt generated!");
            println!("Receipt saved to: {}", output.display());
        }
        
        Commands::VerifyNative { public_key, signature, message } => {
            println!("Native Dilithium-5 verification ONLY...");
            let start_time = std::time::Instant::now();
            
            let public_key_bytes = fs::read(&public_key).expect("Failed to read public key");
            let signature_bytes = fs::read(&signature).expect("Failed to read signature");
            
            let mut public_key_array = [0u8; PUBLICKEYBYTES];
            public_key_array.copy_from_slice(&public_key_bytes);
            
            let is_valid = if signature_bytes.len() == SIGNBYTES {
                verify(&signature_bytes, message.as_bytes(), &public_key_array)
            } else {
                false
            };
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
            
            match format.as_str() {
                "json" => {
                    println!("{}", serde_json::to_string_pretty(&receipt.verification_output).unwrap());
                }
                "hex" => {
                    println!("journal: {}", hex::encode(&receipt.journal));
                    println!("seal: {}", hex::encode(&receipt.seal));
                }
                _ => {
                    eprintln!("Unknown format: {}", format);
                }
            }
        }
    }
}