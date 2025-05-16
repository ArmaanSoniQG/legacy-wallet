// Dilithium WASM (browser) smoke-test  – runs in JSDOM
// ----------------------------------------------------
// NOTE: we import the *bundle* produced by `build:wasm`
import { generateKeyPair, sign, verify } from
  '../packages/wasm-dilithium/dist/dilithium.js';

const enc = new TextEncoder();                     // browser-native
const MSG = enc.encode('Hello PQ');                // plain Uint8Array

describe('Dilithium WASM (browser)', () => {
  test('signs + verifies in the DOM runtime', async () => {
    const { publicKey, secretKey } = await generateKeyPair();   // Uint8Arrays
    const sig = await sign(secretKey, MSG);                     // Uint8Array
    expect(await verify(publicKey, MSG, sig)).toBe(true);
  });
});
