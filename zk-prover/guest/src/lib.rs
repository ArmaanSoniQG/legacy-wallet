//! Dilithium-5 signature verifier guest (RISC 0 0.11)

#![no_std]

extern crate alloc;
use alloc::vec::Vec;

use risc0_zkvm_guest::{env, entry};

// ml-dsa types & traits
use ml_dsa::{
    signature::{Verifier},
    EncodedSignature,          // encoded byte array aliases
    EncodedVerifyingKey,
    MlDsa87, Signature, VerifyingKey,
};

entry!(main);

fn main() {
    const PK_LEN: usize  = 2592;
    const SIG_LEN: usize = 4595;

    // ---------------- inputs ----------------
    let pk_bytes : Vec<u8> = env::read();   // public key
    let sig_bytes: Vec<u8> = env::read();   // signature
    let msg      : Vec<u8> = env::read();   // message

    assert_eq!(pk_bytes.len(),  PK_LEN,  "bad public-key length");
    assert_eq!(sig_bytes.len(), SIG_LEN, "bad signature length");

    // ---------------- parse & verify --------
    // SAFETY: we just checked the lengths; layout is identical (&[u8; N])
    let pk_enc  = unsafe {
        &*(pk_bytes.as_ptr()  as *const EncodedVerifyingKey<MlDsa87>)
    };
    let sig_enc = unsafe {
        &*(sig_bytes.as_ptr() as *const EncodedSignature<MlDsa87>)
    };

    let vk  = VerifyingKey::<MlDsa87>::decode(pk_enc);
    let sig = Signature::<MlDsa87>::decode(sig_enc)
                .expect("invalid signature encoding");

    vk.verify(&msg, &sig).expect("signature verification failed");

    // ---------------- journal ---------------
    env::commit(&1u32);   // success flag

    use sha3::{Digest, Sha3_256};

    let pk_hash: [u8; 32]  = Sha3_256::digest(&pk_bytes).into();
    let msg_hash: [u8; 32] = Sha3_256::digest(&msg).into();

    env::commit(&pk_hash);
    env::commit(&msg_hash);
}
