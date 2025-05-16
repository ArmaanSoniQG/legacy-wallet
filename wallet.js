#!/usr/bin/env node
// wallet.js – QSAFE CLI  (ECDSA • Dilithium-5 • Falcon-512 • Kyber-768)
import fs               from 'node:fs';
import path             from 'node:path';
import crypto           from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { hideBin }      from 'yargs/helpers';
import yargsFactory     from 'yargs';

import { generateKeyPair as kyGen, encapsulate, decapsulate }
  from './qsafe-signer/kyber.mjs';
import { deriveKey, encrypt, decrypt }
  from './qsafe-signer/crypto.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const WALLET     = path.join(__dirname, 'wallet.json');
const LOCKFILE   = path.join(__dirname, 'wallet.lock');

const yargs = yargsFactory(hideBin(process.argv));

// ───────────────────── Day-7  key-pair generation
yargs.command(
  'gen',
  'Generate key-pair (ECDSA default, --alg dilithium | falcon)',
  y => y.option('alg',{choices:['ecdsa','dilithium','falcon'],default:'ecdsa'}),
  async ({ alg }) => {
    if (fs.existsSync(LOCKFILE) && !fs.existsSync(WALLET)) {
      console.error('Wallet is locked. Unlock before generating new keys.');
      process.exit(1);
    }

    if (alg === 'ecdsa') {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ec',{
        namedCurve:'P-256',
        publicKeyEncoding :{type:'spki', format:'pem'},
        privateKeyEncoding:{type:'pkcs8',format:'pem'}
      });
      fs.writeFileSync(WALLET, JSON.stringify({alg,publicKey,privateKey},null,2));
      console.log('🔑  ECDSA P-256 keys written to wallet.json');

    } else if (alg === 'dilithium') {
      // ---------- FIX: use the helper that actually exists ----------
      const { ml_dsa87 } = await import('@noble/post-quantum/ml-dsa');
      const { publicKey, secretKey } = ml_dsa87.keygen();   // ← here
      fs.writeFileSync(WALLET, JSON.stringify({
        alg,
        publicKey : Buffer.from(publicKey).toString('base64'),
        privateKey: Buffer.from(secretKey).toString('base64')
      },null,2));
      console.log('🔑  Dilithium-5 keys written to wallet.json');

    } else { // falcon
      const falcon = await import('./qsafe-signer/falcon.mjs');
      const { publicKey, secretKey } = await falcon.generateKeyPair();
      fs.writeFileSync(WALLET, JSON.stringify({
        alg,
        publicKey : publicKey.toString('base64'),
        privateKey: secretKey.toString('base64')
      },null,2));
      console.log('🔑  Falcon-512 keys written to wallet.json');
    }
  }
);

// --------------- rest of file unchanged (Kyber demo, lock/unlock, sign/verify) ---------------
yargs.command(
  'enc <scheme>',
  'Encrypt/decrypt a shared secret with Kyber-768',
  y => y.positional('scheme',{choices:['kyber']}),
  async () => {
    const { publicKey, secretKey }   = kyGen();
    const { ciphertext, sharedSecret } = encapsulate(publicKey);
    const recovered = decapsulate(ciphertext, secretKey);
    const ok = Buffer.compare(sharedSecret,recovered)===0;
    console.log('🔒  Kyber-768 demo');
    console.log('  shared secret (hex) :',
      Buffer.from(sharedSecret).toString('hex').slice(0,32),'…');
    console.log('  ciphertext length   :', ciphertext.length,'bytes');
    console.log('  decryption matches  :', ok?'✅ true':'❌ false');
  }
);

yargs.command('lock','Encrypt wallet.json with Kyber-derived key',{},async()=>{
  if (!fs.existsSync(WALLET)) { console.error('wallet.json not found'); process.exit(1); }
  const { publicKey:pk, secretKey:sk } = kyGen();
  const { ciphertext:kyCT, sharedSecret } = encapsulate(pk);
  const aesKey = deriveKey(sharedSecret);
  const plain  = fs.readFileSync(WALLET);
  const { iv, ciphertext:enc } = await encrypt(aesKey, plain);
  fs.writeFileSync(LOCKFILE, Buffer.concat([kyCT,iv,enc]));
  fs.unlinkSync(WALLET);
  console.log('🔒  wallet locked');
  console.log('⚠️  Save these values to unlock later:');
  console.log('   kyberSecretKey (base64) :', Buffer.from(sk).toString('base64'));
  console.log('   kyberCiphertext (base64):', Buffer.from(kyCT).toString('base64'));
});

yargs.command('unlock <ct> <sk>','Decrypt wallet.lock back to wallet.json',
  y=>y.positional('ct',{desc:'Kyber ciphertext (base64)'}).positional('sk',{desc:'Kyber secretKey (base64)'}),
  async ({ ct,sk })=>{
    if (!fs.existsSync(LOCKFILE)) { console.error('wallet.lock not found'); process.exit(1); }
    const kyCT = Buffer.from(ct,'base64');
    const kySK = Buffer.from(sk,'base64');
    const lock = fs.readFileSync(LOCKFILE);
    const iv   = lock.subarray(kyCT.length, kyCT.length+12);
    const enc  = lock.subarray(kyCT.length+12);
    const aesKey = deriveKey(decapsulate(kyCT,kySK));
    const plain  = await decrypt(aesKey, iv, enc);
    fs.writeFileSync(WALLET, plain);
    console.log('✅  wallet unlocked → wallet.json');
  }
);

yargs.command('sign <message>','Sign text with wallet key',
  y=>y.option('alg',{choices:['ecdsa','dilithium','falcon']})
       .option('raw',{boolean:true,describe:'print signature only'}),
  async ({ alg,message,raw })=>{
    if (!fs.existsSync(WALLET)) return console.error('Wallet not found (maybe locked?)');
    const w       = JSON.parse(fs.readFileSync(WALLET,'utf8'));
    const keyType = alg || w.alg;
    const msgBuf  = Buffer.from(message);
    let sig;

    if (keyType==='ecdsa'){
      const sign = crypto.createSign('SHA256'); sign.update(msgBuf); sign.end();
      sig = sign.sign(w.privateKey,'base64');
    } else if (keyType==='dilithium'){
      const { ml_dsa87 } = await import('@noble/post-quantum/ml-dsa');
      sig = Buffer.from(ml_dsa87.sign(Buffer.from(w.privateKey,'base64'),msgBuf)).toString('base64');
    } else {
      const falcon = await import('./qsafe-signer/falcon.mjs');
      sig = (await falcon.sign(msgBuf,Buffer.from(w.privateKey,'base64'))).toString('base64');
    }

    console.log(raw ? sig : `✅ Signature (${keyType}) → ${sig}`);
  }
);

yargs.command('verify <message> <signature>','Verify signature with wallet public key',
  y=>y.option('alg',{choices:['ecdsa','dilithium','falcon']})
       .option('pub',{describe:'external public key (base64|PEM)'}),
  async ({ alg,message,signature,pub })=>{
    if (!fs.existsSync(WALLET)) return console.error('Wallet not found (maybe locked?)');
    const w       = JSON.parse(fs.readFileSync(WALLET,'utf8'));
    const keyType = alg || w.alg;
    const msgBuf  = Buffer.from(message);
    const sigBuf  = Buffer.from(signature,'base64');
    const pubKey  = pub
      ? (keyType==='ecdsa' ? pub : Buffer.from(pub,'base64'))
      : (keyType==='ecdsa' ? w.publicKey : Buffer.from(w.publicKey,'base64'));

    let ok=false;
    if (keyType==='ecdsa'){
      const verify = crypto.createVerify('SHA256'); verify.update(msgBuf); verify.end();
      ok = verify.verify(pubKey,sigBuf);
    } else if (keyType==='dilithium'){
      const { ml_dsa87 } = await import('@noble/post-quantum/ml-dsa');
      ok = ml_dsa87.verify(pubKey,msgBuf,sigBuf);
    } else {
      const falcon = await import('./qsafe-signer/falcon.mjs');
      ok = await falcon.verify(pubKey,msgBuf,sigBuf);
    }
    console.log(ok ? `✅ Signature valid (${keyType})`
                   : `❌ Signature INVALID (${keyType})`);
    process.exitCode = ok?0:1;
  }
);

yargs.demandCommand(1).strict().help().argv;
