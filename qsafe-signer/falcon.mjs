// qsafe-signer/falcon.mjs  –  Falcon-512 wrapper using Dashlane bindings
// ====================================================================
import falcon512 from '@dashlane/pqc-sign-falcon-512-node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── load the WASM kernel once ───────────────────────────────────────
let api;                                 // singleton

async function load () {
  if (api) return api;

  // Absolute path to sign.wasm shipped with the package
  const wasmPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../node_modules/@dashlane/pqc-sign-falcon-512-node/dist/sign.wasm'
  );

  api = await falcon512({
    wasmBinaryFile: wasmPath,          // skip URL detection
    locateFile    : () => wasmPath     // Emscripten helper
  });
  return api;                          // { keypair, sign, verify }
}

// ── helpers ─────────────────────────────────────────────────────────
const B = x => (Buffer.isBuffer(x) ? x : Buffer.from(x));

// ── key generation ──────────────────────────────────────────────────
export async function generateKeyPair () {
  const f = await load();
  const { publicKey, privateKey } = await f.keypair();   // Uint8Array
  return { publicKey: B(publicKey), secretKey: B(privateKey) };
}

// ── sign(message, sk) → Buffer(signature) ───────────────────────────
export async function sign (message, secretKey) {
  const f = await load();
  const { signature } = await f.sign(B(message), secretKey);
  return B(signature);                                    // Buffer
}

// ── verify(pk, msg, sig) → boolean ─────────────────────────────────
export async function verify (publicKey, message, signature) {
  const f = await load();
  return await f.verify(signature, B(message), publicKey); // true / false
}
