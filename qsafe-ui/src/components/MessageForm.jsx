// qsafe-ui/src/components/MessageForm.jsx
import { useState } from 'react';
import {
  keccak256,
  toUtf8Bytes,
  BrowserProvider,
  Contract,
} from 'ethers';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils';

import { VERIFIER_ADDR as FALLBACK, ABI } from '../contract.js'; // alias the hard-coded addr
import { deriveSeed } from '../seed.js';
import DeployWallet from './DeployWallet.jsx';

/* ──────────────────────────────────────────────
   Component: MessageForm
   • If the user hasn’t deployed a DilithiumVerifier yet,
     we show <DeployWallet /> instead of the form.
   • Otherwise we let them “Sign & Verify”.
────────────────────────────────────────────── */
export default function MessageForm({ onDone }) {
  // ① Which verifier contract should we talk to?
  const [verifierAddr, setVerifierAddr] = useState(
    localStorage.getItem('verifierAddr') ?? FALLBACK
  );

  // First-time visitor?  Prompt them to deploy a verifier.
  if (!verifierAddr) {
    return (
      <DeployWallet
        onReady={addr => {
          localStorage.setItem('verifierAddr', addr);
          setVerifierAddr(addr);
        }}
      />
    );
  }

  // ② Normal “Sign & Verify” UI
  const [msg, setMsg]   = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!msg.trim() || busy) return;
    setBusy(true);

    try {
      /* 1 ─ Hash the message */
      const hash = keccak256(toUtf8Bytes(msg)); // 0x-prefixed 32-byte digest

      /* 2 ─ Deterministic Dilithium signature (seeded from wallet addr) */
      if (!window.ethereum) throw new Error('MetaMask not found');
      const provider = new BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const addr     = await signer.getAddress();

      const seed            = hexToBytes((await deriveSeed(addr)).slice(2));
      const { secretKey }   = ml_dsa65.keygen(seed);
      const pqBytes         = ml_dsa65.sign(secretKey, hexToBytes(hash.slice(2)));
      const pqSig           = '0x' + bytesToHex(pqBytes);

      /* 3 ─ Write the PQ sig on-chain */
      const verifier = new Contract(verifierAddr, ABI, signer);
      const tx1      = await verifier.recordDilithiumSignature(hash, pqSig);
      await tx1.wait(1);

      /* 4 ─ Raw ECDSA signature (un-prefixed) */
      const ecdsaSig = await window.ethereum.request({
        method: 'personal_sign',   // MetaMask returns r|s|v
        params: [hash, addr],      // (digest, signer)
      });

      /* 5 ─ Hybrid verification via EIP-1271 */
      const magic = await verifier.isValidSignature(hash, ecdsaSig);
      const ok    = magic === '0x1626ba7e';

      /* 6 ─ Bubble result up to <App> */
      onDone({
        hash,
        pqSig:    pqSig.slice(0, 34)  + '…',
        ecdsaSig: ecdsaSig.slice(0, 66) + '…',
        txHash:   tx1.hash,
        ok,
      });
    } catch (err) {
      alert(err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        className="flex-1 border px-2 py-1"
        placeholder="Type a message"
        value={msg}
        onChange={e => setMsg(e.target.value)}
        disabled={busy}
      />
      <button
        className="bg-black text-white px-3"
        disabled={busy}
      >
        {busy ? 'Waiting…' : 'Sign & Verify'}
      </button>
    </form>
  );
}
