use methods::{DILITHIUM_VERIFIER_ELF, DILITHIUM_VERIFIER_ID};
use risc0_zkvm::{default_prover, ExecutorEnv, Receipt};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::Instant;
use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Verify a signature and generate a ZK proof
    Verify {
        /// Path to the Dilithium public key file
        #[arg(short, long)]
        public_key: PathBuf,

        /// Path to the signature file
        #[arg(short, long)]
        signature: PathBuf,

        /// Message to verify (as string)
        #[arg(short, long)]
        message: Option<String>,

        /// Path to message file (alternative to --message)
        #[arg(short = 'f', long)]
        message_file: Option<PathBuf>,

        /// Path to save the receipt
        #[arg(short, long)]
        output: PathBuf,
    },
    
    /// Extract verification data from a receipt
    Extract {
        /// Path to the receipt file
        #[arg(short, long)]
        receipt: PathBuf,
        
        /// Output format (json or hex)
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

#[derive(Serialize, Deserialize, Debug)]
struct VerificationOutput {
    is_valid: bool,
    public_key_hash: [u8; 32],
    message_hash: [u8; 32],
}

fn main() {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::filter::EnvFilter::from_default_env())
        .init();

    // Parse command line arguments
    let args = Args::parse();

    match args.command {
        Commands::Verify { public_key, signature, message, message_file, output } => {
            verify_and_prove(public_key, signature, message, message_file, output);
        },
        Commands::Extract { receipt, format } => {
            extract_receipt_data(receipt, &format);
        },
    }
}

fn verify_and_prove(
    public_key_path: PathBuf,
    signature_path: PathBuf,
    message: Option<String>,
    message_file: Option<PathBuf>,
    output_path: PathBuf,
) {
    println!("Dilithium-5 Signature Verification with RISC Zero zkVM");
    println!("------------------------------------------------------");

    // Get public key
    let public_key = fs::read(&public_key_path)
        .expect("Failed to read public key file");

    // Get signature
    let signature = fs::read(&signature_path)
        .expect("Failed to read signature file");

    // Get message
    let message_bytes = if let Some(msg) = message {
        msg.into_bytes()
    } else if let Some(path) = message_file {
        fs::read(path).expect("Failed to read message file")
    } else {
        eprintln!("No message provided");
        std::process::exit(1);
    };

    // Generate a nonce (timestamp)
    let nonce = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("Time went backwards")
        .as_secs();

    // Create the verification input
    let input = VerificationInput {
        public_key,
        signature,
        message: message_bytes,
        nonce,
    };

    // Generate the proof
    let receipt = generate_proof(input);

    // Save the receipt
    let receipt_bytes = bincode::serialize(&receipt).expect("Failed to serialize receipt");
    fs::write(&output_path, receipt_bytes).expect("Failed to write receipt to file");
    println!("Receipt saved to {}", output_path.display());
    
    // Extract and display verification result
    let verification_result: VerificationOutput = receipt.journal.decode()
        .expect("Failed to deserialize verification result");
    
    println!("Verification result: {}", if verification_result.is_valid { "Valid ✅" } else { "Invalid ❌" });
    println!("Public key hash: 0x{}", hex::encode(verification_result.public_key_hash));
    println!("Message hash: 0x{}", hex::encode(verification_result.message_hash));
}

fn generate_proof(input: VerificationInput) -> Receipt {
    // Prepare the zkVM environment with our input
    let env = ExecutorEnv::builder()
        .write(&input)
        .unwrap()
        .build()
        .unwrap();

    // Start timing the proof generation
    let start = Instant::now();
    println!("Generating zero-knowledge proof...");

    // Generate the proof
    let prover = default_prover();
    let prove_result = prover.prove(env, DILITHIUM_VERIFIER_ELF);

    match prove_result {
        Ok(prove_info) => {
            let duration = start.elapsed();
            println!("Proof generated in {:.2?}", duration);

            // Extract the receipt
            let receipt = prove_info.receipt;

            // Verify the receipt
            println!("Verifying the proof...");
            match receipt.verify(DILITHIUM_VERIFIER_ID) {
                Ok(_) => println!("✅ Proof verification successful!"),
                Err(e) => println!("❌ Proof verification failed: {}", e),
            }

            receipt
        }
        Err(e) => {
            panic!("Proof generation failed: {}", e);
        }
    }
}

fn extract_receipt_data(receipt_path: PathBuf, format: &str) {
    // Read receipt file
    let receipt_bytes = fs::read(&receipt_path).expect("Failed to read receipt file");
    let receipt: Receipt = bincode::deserialize(&receipt_bytes).expect("Failed to deserialize receipt");
    
    // Extract verification result
    let verification_result: VerificationOutput = receipt.journal.decode()
        .expect("Failed to deserialize verification result");
    
    // Display in requested format
    if format == "json" {
        let json = serde_json::to_string_pretty(&verification_result).expect("Failed to serialize to JSON");
        println!("{}", json);
    } else if format == "hex" {
        println!("Journal: 0x{}", hex::encode(receipt.journal.bytes));
        println!("Receipt inner: {:?}", receipt.inner);
    } else {
        println!("Unsupported format: {}", format);
    }
}