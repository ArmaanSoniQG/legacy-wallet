import { keccak_256 } from 'js-sha3';

export async function deriveSeed(address) {
  // ask wallet to sign a deterministic “seed” message once
  const msg = `QuantaSeal Dilithium seed for ${address} 🎯`;
  const sig = await window.ethereum.request({
    method: 'personal_sign',
    params: [msg, address]
  });
  // hash the 65-byte sig → 32-byte seed
  const bytes = new Uint8Array(
    sig.slice(2).match(/../g).map(h => parseInt(h, 16))
  );
  return '0x' + keccak_256(bytes);
}
