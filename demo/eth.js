import { ethers } from 'ethers';

const $ = id => document.getElementById(id);
const log = (...m) => { $('log').textContent += '\n' + m.join(' '); }

let provider, signer, addr, sig;

$('connect').onclick = async () => {
  if (!window.ethereum) { log('❌ MetaMask not found'); return; }
  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();            // triggers MM popup
  addr = await signer.getAddress();
  $('sign').disabled  = false;
  log('🦊 connected →', addr);
};

$('sign').onclick = async () => {
  const msg = $('msg').value;
  sig = await signer.signMessage(msg);
  $('check').disabled = false;
  log('✍️ signature', sig.slice(0, 18) + '…');
};

$('check').onclick = async () => {
  const msg = $('msg').value;
  const who = ethers.verifyMessage(msg, sig);
  log(who === addr ? '✅ signature valid' : '❌ invalid!');
};
