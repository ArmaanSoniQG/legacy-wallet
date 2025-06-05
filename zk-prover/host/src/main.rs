//! Generate a RISC Zero receipt for the Dilithium-5 guest.
//! Usage:
//!   host <guest_elf> <method.id> <pk.bin> <sig.bin> <msg.bin> <out_receipt.json>

use anyhow::{bail, Context, Result};
use risc0_zkvm::{
    host::ProverOpts,                 // public, stable
    prove::Prover,                    // prover engine (0.11.1)
};
use std::{env, fs, path::Path};

fn main() -> Result<()> {
    // ------------------------- CLI -------------------------------------
    let a: Vec<String> = env::args().collect();
    if a.len() != 7 {
        bail!(
            "usage: host <guest_elf> <method.id> <pk.bin> <sig.bin> <msg.bin> <out_receipt.json>"
        );
    }
    let elf_path = &a[1];
    let id_path  = &a[2];
    let pk       = fs::read(&a[3]).context("read pk")?;
    let sig      = fs::read(&a[4]).context("read sig")?;
    let msg      = fs::read(&a[5]).context("read msg")?;
    let out_file = &a[6];

    // ------------------------- load guest + ID --------------------------
    let elf = fs::read(Path::new(elf_path)).context("read guest ELF")?;
    let id  = fs::read(Path::new(id_path)).context("read method.id")?;

    // ------------------------- build prover -----------------------------
    let opts  = ProverOpts::default();                     // STARK proof
    let mut p = Prover::new_with_opts(&elf, &id, opts)?;  // constructor

    p.add_input_u8_slice(&pk);
    p.add_input_u8_slice(&sig);
    p.add_input_u8_slice(&msg);

    let receipt = p.run()?;

    // ------------------------- save receipt ----------------------------
    fs::write(out_file, serde_json::to_vec(&receipt)?)?;
    println!("✓ STARK receipt written → {out_file}");
    Ok(())
}
