import * as falcon from '../qsafe-signer/falcon.mjs';

test('Falcon sign / verify round-trip', async () => {
  const { publicKey, secretKey } = await falcon.generateKeyPair();
  const msg = Buffer.from('PQ-rocks');
  const sig = await falcon.sign(msg, secretKey);
  expect(await falcon.verify(publicKey, msg, sig)).toBe(true);
});
