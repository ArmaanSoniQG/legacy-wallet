import { ml_dsa87 } from '@noble/post-quantum/ml-dsa';
import { saveKeyPair, loadKeyPair } from '../qsafe-signer/persistence.mjs';

const dilithium5 = ml_dsa87;                    // Dilithium-5 API

describe('Dilithium5 wallet flow', () => {
  const MSG = Buffer.from('Hello PQ');

  test('keygen → sign → verify', () => {
    const { publicKey, secretKey } = dilithium5.keygen();
    const sig = dilithium5.sign(secretKey, MSG);
    expect(dilithium5.verify(publicKey, MSG, sig)).toBe(true);
  });

  test('tampering is caught', () => {
    const { publicKey, secretKey } = dilithium5.keygen();
    const sig = dilithium5.sign(secretKey, MSG);
    expect(dilithium5.verify(publicKey, Buffer.from('bad'), sig)).toBe(false);
  });

  test('handles 0-byte and 4 MB messages', () => {
    for (const m of [Buffer.alloc(0), Buffer.alloc(4 * 1024 * 1024, 7)]) {
      const { publicKey, secretKey } = dilithium5.keygen();
      const sig = dilithium5.sign(secretKey, m);
      expect(dilithium5.verify(publicKey, m, sig)).toBe(true);
    }
  });

  test('save ↔ load keeps validity', async () => {
    const kp = dilithium5.keygen();              // { publicKey, secretKey }
    await saveKeyPair(kp);                       // write to disk
    const reload = await loadKeyPair();          // read back
    const sig = dilithium5.sign(reload.secretKey, MSG);
    expect(dilithium5.verify(reload.publicKey, MSG, sig)).toBe(true);
  });

  test('wrong publicKey rejects sig', () => {
    const a = dilithium5.keygen();
    const b = dilithium5.keygen();
    const sig = dilithium5.sign(a.secretKey, MSG);
    expect(dilithium5.verify(b.publicKey, MSG, sig)).toBe(false);
  });
});
