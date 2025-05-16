import { ml_dsa87 } from '@noble/post-quantum/ml-dsa';   // ESM + WASM ready

// ── one-time WASM init ──────────────────────────────────────────────────
if (typeof ml_dsa87.ready === 'function') {
  await ml_dsa87.ready();          // fetch/compile WASM, resolves in browsers
}

// ── resolve helpers, covering every published variant ───────────────────
const GEN = ml_dsa87.generateKeyPair     // future-proof
       ?? ml_dsa87.keyPair               // current browser build
       ?? ml_dsa87.keygen;               // node build

const SIG = ml_dsa87.signDetached ?? ml_dsa87.sign;
const VER = ml_dsa87.verifyDetached ?? ml_dsa87.verify;

if (!GEN || !SIG || !VER) {
  throw new Error('ml_dsa87 helpers not found – library version mismatch');
}

// ── async façades (callers never forget to wait for WASM) ───────────────
export const generateKeyPair = async ()       => GEN();             // {pk,sk}
export const sign            = async (sk, m)  => SIG(sk, m);        // Uint8Array
export const verify          = async (pk, m, s) => VER(pk, m, s);   // boolean
