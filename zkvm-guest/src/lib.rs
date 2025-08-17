use risc0_zkvm::guest::env;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct MigrationAuth {
    pub legacy_addr: [u8; 20],   // EOA derived from secp256k1 pubkey
    pub new_pq_key: Vec<u8>,     // Dilithium/Falcon pubkey bytes (length varies)
    pub msg: Vec<u8>,            // canonical message: hash(new_pq_key||nonce||domain)
    pub sig65: Vec<u8>,          // secp256k1 (r,s,v) - use Vec for serde
    pub nonce: u64,
}

#[derive(Serialize, Deserialize)]
pub struct Journal {
    pub legacy_addr: [u8; 20],
    pub new_pq_key: Vec<u8>,
    pub nonce: u64,
    pub msg_digest: [u8; 32],
}

risc0_zkvm::guest::entry!(main);
pub fn main() {
    let input: MigrationAuth = env::read();

    // VERIFY input.sig65 over input.msg recovers input.legacy_addr (implement with a pure-Rust secp256k1 lib compatible with no_std).
    // Pseudocode:
    // 1) let (r,s,v) = parse_sig(input.sig65);
    // 2) let pubkey = ecrecover(input.msg, v, r, s);
    // 3) assert!(keccak(pubkey)[12..] == input.legacy_addr);

    let digest = keccak256(&input.msg);
    let out = Journal { legacy_addr: input.legacy_addr, new_pq_key: input.new_pq_key, nonce: input.nonce, msg_digest: digest };
    env::commit(&out);
}

fn keccak256(data: &[u8]) -> [u8; 32] {
    use sha3::{Digest, Keccak256};
    let mut hasher = Keccak256::new();
    hasher.update(data);
    hasher.finalize().into()
}