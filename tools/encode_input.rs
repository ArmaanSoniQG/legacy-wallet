use serde::{Serialize, Deserialize};
use std::fs::write;
use std::io::{self, Read};

#[derive(Serialize, Deserialize)]
struct MigrationAuth { 
    legacy_addr: [u8;20], 
    new_pq_key: Vec<u8>, 
    msg: Vec<u8>, 
    sig65: Vec<u8>, 
    nonce: u64 
}

fn main() {
    // Read JSON from stdin and re-encode with risc0 serde
    let mut input_json = String::new();
    io::stdin().read_to_string(&mut input_json).unwrap();
    let m: MigrationAuth = serde_json::from_str(&input_json).unwrap();
    let bin = risc0_zkvm::serde::to_vec(&m).unwrap();
    write("input.bin", bin).unwrap();
    println!("Encoded {} bytes to input.bin", bin.len());
}