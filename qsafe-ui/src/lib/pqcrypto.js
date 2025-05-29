// ----------------------------- pqcrypto.js -----------------------------
// Wraps dilithium-crystals v1.0.6  (works in browser)

import { dilithium } from 'dilithium-crystals';
import {
  ethers,
  AbiCoder,
  keccak256,
}                      from 'ethers';

let readyP;
async function ready() {
  readyP ||= (async () => { await dilithium.ready; return dilithium; })();
  return readyP;
}

/* ---------- Dilithium API ---------- */
/**
+ * mode = 'dilithium3' | 'dilithium5'
+ * (library recognises these names – check its README)
+ */
export async function generateKeyPair(mode = 'dilithium5') {
  const d = await ready();
  const { publicKey, privateKey } = await d.keyPair({ mode });
  return { publicKey, privateKey };
}

export async function sign(priv, msgBytes) {
  const d = await ready();
  return d.signDetached(msgBytes, priv);  // Uint8Array sig
}
export async function verify(pub, msgBytes, sig) {
  const d = await ready();
  return d.verifyDetached(sig, msgBytes, pub);
}

/* ---------- Contract-hash helpers ---------- */
const coder = new AbiCoder();

export const createRegisterMsg = (wallet, owner) =>
  ethers.solidityPackedKeccak256(['address', 'address'], [wallet, owner]);

export const createTxMsg = (wallet, to, value, data, nonce) =>
  keccak256(
    coder.encode(
      ['address','address','uint256','bytes32','uint256'],
      [wallet,   to,       value,    keccak256(data),      nonce]
    )
  );

/* ---------- Browser-safe hex helpers ---------- */
const toHex = (bytes) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export const fmt = (bytes) => {
  const hex = toHex(bytes);
  return `0x${hex.slice(0, 12)}…${hex.slice(-12)}`;
};
