#!/usr/bin/env node
/**
 * QuantaSeal hybrid-signature demo
 * --------------------------------
 *   1. Hash message  (Keccak-256)
 *   2. Dilithium-5   signature   (@noble/post-quantum)
 *   3. recordDilithiumSignature()  → on-chain
 *   4. Raw ECDSA     signature   (ethers v6 SigningKey)
 *   5. isValidSignature()         → ✅ / ❌
 *
 *   run:  node quantaseal-onchain/script/demoHybrid.js "hello world"
 */

import 'dotenv/config';                                 // loads .env
import { keccak256, toUtf8Bytes, hexlify } from 'ethers';
import { JsonRpcProvider, Wallet, Contract } from 'ethers';
import { ml_dsa65 }                     from '@noble/post-quantum/ml-dsa';
import { hexToBytes, bytesToHex }       from '@noble/hashes/utils';
import { recoverAddress }               from 'ethers';

// ──────────────────────────────────────────────────────────────────────────
// 0. Environment / sanity checks
// ──────────────────────────────────────────────────────────────────────────
const PRIV = process.env.PRIVATE_KEY?.trim();
const RPC  = process.env.SEPOLIA_RPC?.trim();
const VERIFIER_ADDR = '0x26e64c4ee262ad23839d794fb854f53904a8e3b6'; // ⬅ all lowercase


if (!PRIV || !RPC) {
  console.error('❌  Set PRIVATE_KEY and SEPOLIA_RPC in .env');  process.exit(1);
}
if (!/^0x[0-9a-fA-F]{64}$/.test(PRIV)) {
  console.error('❌  PRIVATE_KEY must be 0x-prefixed 64-hex-chars'); process.exit(1);
}

// ──────────────────────────────────────────────────────────────────────────
// 1. Prepare message & hash
// ──────────────────────────────────────────────────────────────────────────
const msg      = process.argv.slice(2).join(' ') || 'Hello hybrid!';
const msgBytes = toUtf8Bytes(msg);
const msgHash  = keccak256(msgBytes);           // 0x-hex string (32-bytes)

console.log(`💬  Message:   "${msg}"`);
console.log(`🔑  Keccak256: ${msgHash}`);

// ──────────────────────────────────────────────────────────────────────────
// 2. Dilithium-5 signature
// ──────────────────────────────────────────────────────────────────────────
const { publicKey: pqPub, secretKey: pqSk } = ml_dsa65.keygen();
const pqSigBytes  = ml_dsa65.sign(pqSk, hexToBytes(msgHash.slice(2)));
const pqSigHex    = '0x' + bytesToHex(pqSigBytes);
console.log(`✍️  Dilithium-5 sig: ${pqSigHex.slice(0, 48)}…${pqSigHex.slice(-16)}`);

// ──────────────────────────────────────────────────────────────────────────
// 3. Connect provider, wallet, contract
// ──────────────────────────────────────────────────────────────────────────
const provider = new JsonRpcProvider(RPC);
const wallet   = new Wallet(PRIV, provider);
console.log('👤  Signer (ECDSA) address:', await wallet.getAddress());

const ABI = [
  'function recordDilithiumSignature(bytes32,bytes)',
  'function isValidSignature(bytes32,bytes) view returns (bytes4)',
  'event PQSignatureRecorded(bytes32 indexed msgHash, bytes32 pqHash)'
];

const verifier = new Contract(VERIFIER_ADDR, ABI, wallet);

// ──────────────────────────────────────────────────────────────────────────
// 4. Broadcast Dilithium signature
// ──────────────────────────────────────────────────────────────────────────
console.log('⛓  recordDilithiumSignature → broadcast …');
const tx = await verifier.recordDilithiumSignature(msgHash, pqSigHex);
await tx.wait();
console.log(`   ✔ Dilithium sig recorded in tx ${tx.hash}\n`);

// ──────────────────────────────────────────────────────────────────────────
// 5. Raw ECDSA signature (NO prefix) + quick local sanity check
// ──────────────────────────────────────────────────────────────────────────
const { r, s, v } = wallet.signingKey.sign(msgHash);   // reuse the key already parsed
const ecdsaSig = hexlify(
  Buffer.concat([
    Buffer.from(r.slice(2).padStart(64, '0'), 'hex'),
    Buffer.from(s.slice(2).padStart(64, '0'), 'hex'),
    Buffer.from([Number(v)])               // 27 or 28
  ])
);
const recAddr = recoverAddress(msgHash, ecdsaSig);
if (recAddr.toLowerCase() !== (await wallet.getAddress()).toLowerCase()) {
  console.error('❌  ECDSA self-check failed (recovered address mismatch)'); process.exit(1);
}
console.log('✍️  ECDSA sig:', ecdsaSig);

// ──────────────────────────────────────────────────────────────────────────
// 6. isValidSignature()  — hybrid verification
// ──────────────────────────────────────────────────────────────────────────
const MAGIC = '0x1626ba7e';
let res;
try {
  res = await verifier.isValidSignature(msgHash, ecdsaSig);
} catch (err) {
  console.error('❌  isValidSignature() reverted:', err.reason || err); process.exit(1);
}
if (res === MAGIC) {
  console.log('✅  Hybrid verification passed ✔');
} else {
  console.error('❌  Hybrid verification failed (returned', res, ')');
}

// ──────────────────────────────────────────────────────────────────────────
// 7. (Optional) show last PQSignatureRecorded event for this msgHash
// ──────────────────────────────────────────────────────────────────────────
const filter = verifier.filters.PQSignatureRecorded(msgHash);
const evts   = await verifier.queryFilter(filter, -5000);   // last ~5k blocks
if (evts.length) {
  const last = evts[evts.length - 1];
  console.log('\n📝  On-chain record →', {
    block:       last.blockNumber,
    pqHash:      last.args.pqHash,
    txHash:      last.transactionHash
  });
} else {
  console.log('ℹ️  No PQSignatureRecorded event found for this message hash.');
}
