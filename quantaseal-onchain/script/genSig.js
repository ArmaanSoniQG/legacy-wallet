#!/usr/bin/env node
/*  scripts/genSig.js
 *  Invoked from Forge via vm.ffi:
 *      node scripts/genSig.js <msgHashHex>
 *  Prints a Dilithium-5 signature as a hex string (no “0x”) to stdout.
 */
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa";
import { hexToBytes, bytesToHex } from "@noble/hashes/utils";

// ── read arg & accept either 0x-prefixed or bare hex ──
const raw = process.argv[2] || "";
const msgHex = raw.startsWith("0x") ? raw.slice(2) : raw;
if (!msgHex) { console.error("need msg hex"); process.exit(1); }

// ── sign with a throw-away test key ──
const msg = hexToBytes(msgHex);
const key = ml_dsa65.keygen();            // { publicKey, secretKey }
const sig = ml_dsa65.sign(key.secretKey, msg);

// ── output signature bytes as hex (no 0x) ──
process.stdout.write(bytesToHex(sig));
