// qsafe-signer/crypto.mjs  – HKDF & AES-GCM helpers (ESM)
import { hkdf }   from '@noble/hashes/hkdf';
import { sha512 } from '@noble/hashes/sha2';      // ← new canonical path
import { randomBytes } from 'node:crypto';

/* deriveKey(sharedSecret: Uint8Array) → 32-byte AES key */
export function deriveKey(secret) {
  return hkdf(sha512, secret, /*salt*/ new Uint8Array(), /*info*/ undefined, 32);
}

/* AES-GCM encrypt Uint8Array → { iv, ciphertext } */
export async function encrypt(keyBytes, plainBytes) {
  const iv  = randomBytes(12);
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const ct  = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes)
  );
  return { iv, ciphertext: ct };
}

/* AES-GCM decrypt */
export async function decrypt(keyBytes, iv, ct) {
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  return new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  );
}
