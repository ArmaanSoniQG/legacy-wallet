use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Generate a new Dilithium-5 key pair (mock)
    Keygen {
        /// Output file for the key pair
        #[arg(short, long)]
        output: PathBuf,
    },
    /// Export public key to a separate file
    ExportPk {
        /// Path to the key pair file
        #[arg(short, long)]
        key: PathBuf,
        
        /// Output file for the public key
        #[arg(short, long)]
        output: PathBuf,
    },
}

#[derive(Serialize, Deserialize)]
struct KeyPair {
    public_key: Vec<u8>,
    secret_key: Vec<u8>,
}

fn main() {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Keygen { output } => {
            generate_keypair(output);
        }
        Commands::ExportPk { key, output } => {
            export_public_key(key, output);
        }
    }
}

fn generate_keypair(output: &PathBuf) {
    println!("Generating mock Dilithium-5 key pair...");
    
    // Generate mock keys with correct sizes
    let public_key = vec![0u8; 2592];  // Dilithium-5 public key size
    let secret_key = vec![0u8; 4896];  // Dilithium-5 secret key size
    
    // Calculate public key hash
    let mut hasher = Sha256::new();
    hasher.update(&public_key);
    let pk_hash = hasher.finalize();
    
    println!("Key pair generated successfully!");
    println!("Public key size: {} bytes", public_key.len());
    println!("Secret key size: {} bytes", secret_key.len());
    println!("Public key hash: {}", hex::encode(pk_hash));
    
    // Save key pair to file
    let keypair_data = KeyPair {
        public_key,
        secret_key,
    };
    
    let json = serde_json::to_string_pretty(&keypair_data).expect("Failed to serialize key pair");
    fs::write(output, json).expect("Failed to write key pair to file");
    
    println!("Key pair saved to {}", output.display());
}

fn export_public_key(key_path: &PathBuf, output: &PathBuf) {
    println!("Exporting public key...");
    
    // Load key pair
    let key_json = fs::read_to_string(key_path).expect("Failed to read key pair file");
    let keypair: KeyPair = serde_json::from_str(&key_json).expect("Failed to parse key pair");
    
    // Save public key to file
    fs::write(output, &keypair.public_key).expect("Failed to write public key to file");
    
    println!("Public key exported to {}", output.display());
    println!("Public key size: {} bytes", keypair.public_key.len());
    
    // Calculate public key hash
    let mut hasher = Sha256::new();
    hasher.update(&keypair.public_key);
    let pk_hash = hasher.finalize();
    println!("Public key hash: {}", hex::encode(pk_hash));
}