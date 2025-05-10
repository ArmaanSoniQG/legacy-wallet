// src/dilithium.js  (CommonJS)
const { ml_dsa87 } = require('@noble/post-quantum/ml-dsa'); // Dilithium‑5 ≈ “87”

exports.generateDilithiumKeyPair = () => ml_dsa87.keygen();      // { publicKey, secretKey }
exports.signDilithium          = (msg, privKey) => ml_dsa87.sign(privKey, msg);
exports.verifyDilithium        = (sig, msg, pubKey) => ml_dsa87.verify(pubKey, msg, sig);
