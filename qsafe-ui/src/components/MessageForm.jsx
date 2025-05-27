// qsafe-ui/src/components/MessageForm.jsx
import { useState } from 'react';
import {
  keccak256, toUtf8Bytes,
  BrowserProvider, Contract,
} from 'ethers';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils';

import { ABI, VERIFIER_ADDR as FALLBACK } from '../contract.js';
import { deriveSeed } from '../seed.js';

/* ───────────────────────────────────────────────
   MessageForm
   • expects `verifierAddr` prop (null until wallet exists)
   • emits { hash, pqSig, ecdsaSig, txHash, ok } via `onDone`
────────────────────────────────────────────── */
export default function MessageForm({ verifierAddr, onDone }) {
  /* If the user hasn't deployed a wallet yet we render nothing.
     (App shows the blue "Create my QuantaSeal Wallet" button instead.) */
  const addr = verifierAddr ?? FALLBACK;
  if (!addr) return null;

  const [msg,  setMsg]  = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!msg.trim() || busy) return;
    setBusy(true);

    try {
      /* 1 - hash the message */
      const hash = keccak256(toUtf8Bytes(msg));        // 0x-prefixed

      /* 2 - deterministic Dilithium sig */
      if (!window.ethereum) throw new Error('MetaMask not found');
      const provider = new BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const userAddr = await signer.getAddress();

      const seed          = hexToBytes((await deriveSeed(userAddr)).slice(2));
      const { secretKey } = ml_dsa65.keygen(seed);
      const pqSigBytes    = ml_dsa65.sign(secretKey, hexToBytes(hash.slice(2)));
      const pqSig         = '0x' + bytesToHex(pqSigBytes);

      /* 3 - store PQ sig on-chain */
      const verifier = new Contract(addr, ABI, signer);
      const tx1      = await verifier.recordDilithiumSignature(hash, pqSig);
      await tx1.wait(1);

      /* 4 - raw ECDSA sig */
      const ecdsaSig = await window.ethereum.request({
        method: 'personal_sign',
        params: [hash, userAddr],
      });

      /* 5 - hybrid verify via ERC-1271 */
      const magic = await verifier.isValidSignature(hash, ecdsaSig);
      const ok    = magic === '0x1626ba7e';

      /* 6 - bubble up to App */
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
