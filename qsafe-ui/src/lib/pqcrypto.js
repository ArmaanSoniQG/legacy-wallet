/**
 * pqcrypto.js  –  Day 26 single source-of-truth for PQ operations
 * NOTE: uses placeholder 'dilithium-wasm' lib.  Replace with the library
 * you actually compiled (e.g., @openquantum/dilithium or your own build).
 */

import * as dilithium from 'dilithium-wasm'; // <- swap to real lib

// ---------- 1.  Key generation ---------- //
export async function generateKeyPair(algo = 'Dilithium') {
  if (algo !== 'Dilithium') throw new Error(`algo ${algo} unimplemented`);

  const { publicKey, privateKey } = await dilithium.keyPair();
  return { publicKey, privateKey };
}

// ---------- 2.  Signing ---------- //
export async function sign(priv, messageBytes, algo = 'Dilithium') {
  if (algo !== 'Dilithium') throw new Error(`algo ${algo} unimplemented`);

  return dilithium.sign(messageBytes, priv);
}

// ---------- 3.  Verification ---------- //
export async function verify(algo, pub, msgBytes, sig) {
  if (algo !== 'Dilithium') return false;            // stub for future algos
  return dilithium.verify(sig, msgBytes, pub);
}

// ---------- 4.  Helpers to build messages ---------- //
import { ethers } from 'ethers';

// message for key-registration proof (binds key to wallet + owner)
export function createRegisterMessage(contractAddr, ownerAddr) {
  return ethers.solidityPackedKeccak256(
    ['address', 'address'],
    [contractAddr, ownerAddr]
  );
}

// message for executeTransaction (mirrors wallet contract!)
export function createTxMessage(contractAddr, to, value, data, nonce) {
  return ethers.solidityPackedKeccak256(
    ['address', 'address', 'uint256', 'bytes32', 'uint256'],
    [contractAddr, to, value, ethers.keccak256(data), nonce]
  );
}

// ---------- 5.  Pretty print truncation ---------- //
export function formatPubKey(bytes) {
  const hex = Buffer.from(bytes).toString('hex');
  return `0x${hex.slice(0, 12)}…${hex.slice(-12)}`;
}
