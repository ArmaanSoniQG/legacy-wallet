#!/usr/bin/env node
import fs from 'node:fs'; import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hideBin } from 'yargs/helpers';
import yargsFactory from 'yargs';
import { generateKeyPair as kyGen, encapsulate, decapsulate } from './qsafe-signer/kyber.mjs';
import { deriveKey, encrypt, decrypt } from './qsafe-signer/crypto.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const WALLET     = path.join(__dirname, 'wallet.json');
const LOCKFILE   = path.join(__dirname, 'wallet.lock');

const yargs = yargsFactory(hideBin(process.argv));

// ────────────── CLI ──────────────
yargsFactory(hideBin(process.argv))
  // ---------- Day-7 key-gen (ECDSA / Dilithium-5) ----------
  .command('gen', 'Generate a key-pair', y =>
    y.option('alg', { choices: ['ecdsa', 'dilithium'], default: 'ecdsa' }),
    async ({ alg }) => { /* unchanged -- omitted for brevity */ })

  // ---------- Day-10: Kyber-768 encryption demo ----------
  .command('enc <scheme>', 'Encrypt/decrypt a shared secret with Kyber-768',
    y => y.positional('scheme', { choices: ['kyber'] }),
    async ({ scheme }) => {
      if (scheme !== 'kyber') {
        console.error('Only "kyber" is supported today'); process.exit(1);
      }

      // dynamic import keeps startup fast
      const { generateKeyPair, encapsulate, decapsulate }
            = await import('./qsafe-signer/kyber.mjs');

      const { publicKey, secretKey }   = generateKeyPair();
      const { ciphertext, sharedSecret } = encapsulate(publicKey);
      const recovered = decapsulate(ciphertext, secretKey);

      const ok = Buffer.compare(sharedSecret, recovered) === 0;
      console.log('🔒  Kyber-768 demo');
      console.log('  shared secret (hex) :', Buffer.from(sharedSecret).toString('hex').slice(0,32), '…');
      console.log('  ciphertext length   :', ciphertext.length, 'bytes');
      console.log('  decryption matches  :', ok ? '✅ true' : '❌ false');
    }
  )
  .demandCommand(1)
  .help()
  .argv;

  /* ---------- Day-11: lock ECDSA key ---------- */
yargs.command('lock', 'Encrypt wallet.json with Kyber-derived key', {}, async () => {
  if (!fs.existsSync(WALLET)) {
    console.error('wallet.json not found'); process.exit(1);
  }
  // 1. fresh Kyber key-pair
  const { publicKey: pk, secretKey: sk } = kyGen();
  // 2. encapsulate → AES key
  const { ciphertext, sharedSecret } = encapsulate(pk);
  const aesKey = deriveKey(sharedSecret);
  // 3. AES-GCM encrypt the wallet
  const plain  = new Uint8Array(fs.readFileSync(WALLET));
  const { iv, ciphertext: enc } = await encrypt(aesKey, plain);
  // 4. persist lock-blob (ciphertext‖iv‖kyberCiphertext)
  const blob = Buffer.concat([ciphertext, iv, enc]);
  fs.writeFileSync(LOCKFILE, blob);
  fs.unlinkSync(WALLET);
  console.log('🔒  wallet locked');
  console.log('⚠️  Save these values to unlock later:');
  console.log('   kyberSecretKey (base64) :', Buffer.from(sk).toString('base64'));
  console.log('   kyberCiphertext (base64):', Buffer.from(ciphertext).toString('base64'));
});

/* ---------- Day-11: unlock ---------- */
yargs.command('unlock <ct> <sk>', 'Decrypt wallet.lock back to wallet.json', y =>
  y
    .positional('ct', { desc: 'Kyber ciphertext (base64)' })
    .positional('sk', { desc: 'Kyber secretKey  (base64)' }),
  async ({ ct, sk }) => {
    if (!fs.existsSync(LOCKFILE)) {
      console.error('wallet.lock not found'); process.exit(1);
    }
    const kyCT = Buffer.from(ct, 'base64');
    const kySK = Buffer.from(sk, 'base64');
    const lock = fs.readFileSync(LOCKFILE);

    // lock = kyCT (len 1088) ‖ iv (12) ‖ encWallet (...)
    const iv        = lock.subarray(kyCT.length, kyCT.length + 12);
    const encWallet = lock.subarray(kyCT.length + 12);

    const shared    = decapsulate(kyCT, kySK);
    const aesKey    = deriveKey(shared);
    const plain     = await decrypt(aesKey, iv, encWallet);
    fs.writeFileSync(WALLET, plain);
    console.log('✅  wallet unlocked -> wallet.json');
  }
);

yargs.demandCommand(1).strict().help().argv;