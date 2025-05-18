// demo/eth.js  (loaded by eth.html)
//
// Minimal MetaMask connect → sign → verify demo
// ──────────────────────────────────────────────────────────────
import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.14.1/dist/ethers.min.js';

// grab the DOM elements -------------------------------------------------
const connectBtn = document.getElementById('btn-connect');
const   signBtn  = document.getElementById('btn-sign');
const  checkBtn  = document.getElementById('btn-check');
const  textArea  = document.getElementById('msg');
const  logBox    = document.getElementById('log');

// hard-stop if HTML IDs don’t match
if (!connectBtn || !signBtn || !checkBtn || !textArea || !logBox) {
  throw new Error('❌ eth.js — one or more required DOM elements not found. Check element IDs in eth.html');
}

let signer, address, sig;

// log helper ------------------------------------------------------------
function log (msg, ok = true) {
  logBox.textContent += `\n${ ok ? '✔' : '✗'} ${msg}`;
  logBox.scrollTop     = logBox.scrollHeight;
}

// pick the MetaMask provider (handles multi-provider browsers) ----------
function pickProvider () {
  const eth = window.ethereum;
  if (!eth)               return undefined;
  if (eth.providers?.length)
    return eth.providers.find(p => p.isMetaMask) ?? eth.providers[0];
  return eth;
}

// ───────────────── connect ────────────────────────────────────────────
connectBtn.addEventListener('click', async () => {
  const eth = pickProvider();
  if (!eth) return log('No Ethereum provider found', false);

  try {
    await eth.request({ method: 'eth_requestAccounts' });     // ⬅ MetaMask popup
    const provider = new ethers.BrowserProvider(eth);
    signer  = await provider.getSigner();
    address = await signer.getAddress();
    log(`connected → ${address.slice(0,6)}…${address.slice(-4)}`);
    signBtn.disabled = false;
  } catch {
    log('connection rejected', false);
  }
});

// ───────────────── sign ───────────────────────────────────────────────
signBtn.addEventListener('click', async () => {
  try {
    sig = await signer.signMessage(textArea.value);           // ⬅ MetaMask popup
    log('signature created');
    checkBtn.disabled = false;
  } catch {
    log('sign rejected', false);
  }
});

// ───────────────── verify ─────────────────────────────────────────────
checkBtn.addEventListener('click', async () => {
  try {
    const recovered = ethers.verifyMessage(textArea.value, sig);
    const ok = recovered.toLowerCase() === address.toLowerCase();
    log(ok ? 'signature valid' : 'signature INVALID', ok);
  } catch {
    log('verification failed', false);
  }
});
