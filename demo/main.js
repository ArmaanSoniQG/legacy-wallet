import * as dl5 from './dilithium.js';

const $ = (id) => document.getElementById(id);
const log = (m) => ($('out').textContent += m + '\n');

let keyPair, signature;

$('btnGen').onclick = () => {
  keyPair = dl5.generateKeyPair();
  $('btnSign').disabled = false;
  log('✔️  keyPair generated');
};

$('btnSign').onclick = () => {
  const msg = new TextEncoder().encode($('msg').value);
  signature = dl5.sign(keyPair.secretKey, msg);
  $('btnVerify').disabled = false;
  log('✍️  signature (base64): ' + btoa(String.fromCharCode(...signature)));
};

$('btnVerify').onclick = () => {
  const msg = new TextEncoder().encode($('msg').value);
  const ok  = dl5.verify(keyPair.publicKey, msg, signature);
  log(ok ? '✅  signature valid' : '❌  FAIL (signature mismatch)');
};
