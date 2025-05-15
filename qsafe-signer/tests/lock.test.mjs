import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateKeyPair, encapsulate, decapsulate
} from '../qsafe-signer/kyber.mjs';
import { deriveKey, encrypt, decrypt } from '../qsafe-signer/crypto.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tmp = path.join(__dirname, 'tmp.wallet');

afterAll(() => { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); });

test('lock+unlock round-trip', async () => {
  const plain = Buffer.from('test-wallet');
  fs.writeFileSync(tmp, plain);

  const { publicKey, secretKey } = generateKeyPair();
  const { ciphertext, sharedSecret } = encapsulate(publicKey);
  const aesKey = deriveKey(sharedSecret);
  const { iv, ciphertext: enc } = await encrypt(aesKey, plain);
  const decKey = deriveKey(decapsulate(ciphertext, secretKey));
  const recovered = await decrypt(decKey, iv, enc);

  expect(Buffer.compare(plain, recovered)).toBe(0);
});
