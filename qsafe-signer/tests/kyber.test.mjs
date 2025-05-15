import { generateKeyPair, encapsulate, decapsulate }
  from '../qsafe-signer/kyber.mjs';

describe('Kyber768 round-trip', () => {
  test('encapsulate → decapsulate', () => {
    const { publicKey, secretKey }     = generateKeyPair();
    const { ciphertext, sharedSecret } = encapsulate(publicKey);
    const plain = decapsulate(ciphertext, secretKey);
    expect(Buffer.compare(sharedSecret, plain)).toBe(0);
  });
});
