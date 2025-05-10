// tests/dilithium.demo.js
const {
  generateDilithiumKeyPair,
  signDilithium,
  verifyDilithium
} = require('../src');

const msg = Buffer.from('QSafe Day‑5 smoke test');

(async () => {
  const { publicKey, secretKey } = generateDilithiumKeyPair();
  const sig = signDilithium(msg, secretKey);
  const ok = verifyDilithium(sig, msg, publicKey);
  console.log(`Dilithium round‑trip ${ok ? 'PASSED' : 'FAILED'}`);
  if (!ok) process.exit(1);
})();
