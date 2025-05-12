#!/usr/bin/env node
// wallet.js — CLI for PQ key generation + backup

const yargs       = require('yargs');
const { hideBin } = require('yargs/helpers');
const fs          = require('fs');
const crypto      = require('crypto');

// We'll do a dynamic import of Noble's PQ library for Dilithium
async function generateKeys(alg) {
  if (alg === 'dilithium') {
    // 1) Dynamically import the Noble PQC library
    const pq = await import('@noble/post-quantum');
    // 2) Wait for WASM init (Dilithium is under `pq.mlDsa`)
    await pq.mlDsa.ready;

    // 3) Generate a Dilithium keypair (default = Dilithium5)
    //    If you want a smaller signature, do: pq.mlDsa.keyPair({ name: 'Dilithium3' }) etc.
    const { publicKey, privateKey } = pq.mlDsa.keyPair();

    // 4) Write to wallet.json
    fs.writeFileSync(
      'wallet.json',
      JSON.stringify({
        alg: 'dilithium',
        publicKey:  Buffer.from(publicKey).toString('base64'),
        privateKey: Buffer.from(privateKey).toString('base64')
      }, null, 2)
    );
    console.log('🔑  Dilithium keys written to wallet.json');
  } else {
    // Default ECDSA (classic)
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'secp256k1'
    });
    fs.writeFileSync(
      'wallet.json',
      JSON.stringify({
        alg: 'ecdsa',
        publicKey:  publicKey.export({ type: 'spki',  format: 'pem' }),
        privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' })
      }, null, 2)
    );
    console.log('🔑  ECDSA keys written to wallet.json');
  }
}

// yargs CLI commands
yargs(hideBin(process.argv))
  .command(
    'gen',
    'Generate a key-pair (ECDSA or Dilithium)',
    y => y.option('alg', {
      default: 'ecdsa',
      choices: ['ecdsa', 'dilithium'],
      describe: 'Key algorithm'
    }),
    argv => generateKeys(argv.alg).catch(err => {
      console.error('❌  Keygen failed:', err);
      process.exit(1);
    })
  )
  .command(
    'backup',
    'Encrypt wallet.json → wallet.enc using Kyber KEM',
    y => y.option('kem', {
      default: 'kyber',
      choices: ['kyber'],
      describe: 'KEM algorithm (only kyber for now)'
    }),
    async () => {
      const { backup } = require('./wallet-backup');
      await backup();
    }
  )
  .demandCommand(1, 'You need to specify a command')
  .help()
  .argv;
