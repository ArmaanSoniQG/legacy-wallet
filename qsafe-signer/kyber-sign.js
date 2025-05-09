// File: qsafe-signer/kyber-sign.js
const { kyber } = require('kyber-crystals');

;(async () => {
  // 1) Init the WASM module
  await kyber.ready;

  // 2) Generate a keypair
  const { publicKey, privateKey } = await kyber.keyPair();
  console.log('publicKey length:', publicKey.length);
  console.log('privateKey length:', privateKey.length);

  // 3) KEM encapsulate → { cyphertext, secret }
  const { cyphertext, secret } = await kyber.encrypt(publicKey);
  console.log('cyphertext length:', cyphertext.length);
  console.log('secret length:    ', secret.length);

  // 4) KEM decapsulate
  const recovered = await kyber.decrypt(cyphertext, privateKey);
  console.log('recovered length:', recovered.length);

  // 5) Compare
  console.log('secrets match?   ', Buffer.compare(recovered, secret) === 0);
})();
