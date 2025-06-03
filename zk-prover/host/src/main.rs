use risc0_zkvm::{default_prover, ProverOpts};
use pqcrypto_dilithium::dilithium5::{keypair, PublicKey, SecretKey};

fn main() {
    let (pk, sk) = keypair();
    let opts = ProverOpts::groth16();

    let mut prover = default_prover();
    prover.add_input_u8_slice(pk.as_bytes());
    prover.add_input_u8_slice(sk.as_bytes());

    let receipt = prover.run_with_opts(opts).unwrap();

    println!("SNARK proof generated ✅");
    println!("Public key: {:?}", receipt.get_journal_vec());
}
