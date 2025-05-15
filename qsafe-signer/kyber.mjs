// Kyber-768 helper (normalises Noble's camel-case keys)
import { ml_kem768 } from '@noble/post-quantum/ml-kem';

// key-pair: { publicKey, secretKey }
export const generateKeyPair = () => ml_kem768.keygen();

// encapsulate → normalise  cipherText  ➜  ciphertext
export const encapsulate = (publicKey) => {
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey);
  return { ciphertext: cipherText, sharedSecret };
};

// order = (ciphertext, secretKey)
export const decapsulate = (ciphertext, secretKey) =>
  ml_kem768.decapsulate(ciphertext, secretKey);
