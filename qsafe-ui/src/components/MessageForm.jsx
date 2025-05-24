import { useState } from 'react';
import { keccak256, toUtf8Bytes, BrowserProvider, Contract } from 'ethers';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils';
import { VERIFIER_ADDR, ABI } from '../contract.js';

export default function MessageForm({ onDone }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!msg.trim() || busy) return;
    setBusy(true);

    try {
      /* 1 ─ Hash */
      const hash = keccak256(toUtf8Bytes(msg)); // 0x-hex32

      /* 2 ─ Dilithium sig (browser) */
      const { secretKey } = ml_dsa65.keygen();
      const pqBytes = ml_dsa65.sign(secretKey, hexToBytes(hash.slice(2)));
      const pqSig   = '0x' + bytesToHex(pqBytes);

      /* 3 ─ Connect MetaMask */
      if (!window.ethereum) throw new Error('MetaMask not found');
      const provider = new BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const addr     = await signer.getAddress();

      /* 4 ─ Broadcast PQ sig */
      const verifier = new Contract(VERIFIER_ADDR, ABI, signer);
      const tx1      = await verifier.recordDilithiumSignature(hash, pqSig);
      const receipt1 = await tx1.wait();

      /* 5 ─ Raw ECDSA sig (no "\x19Ethereum Signed Message" prefix) */
      const ecdsaSig = await window.ethereum.request({
        method: 'personal_sign',
        params: [hash, addr]
      });

      /* 6 ─ Call isValidSignature */
      const magic = await verifier.isValidSignature(hash, ecdsaSig);
      const ok    = magic === '0x1626ba7e';

      /* 7 ─ Show result */
      onDone({
        hash, pqSig,
        ecdsaSig: ecdsaSig.slice(0, 66) + '…',
        txHash: receipt1.transactionHash,
        ok
      });
    } catch (err) {
      alert(err.message ?? err);
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
      >{busy ? 'Waiting…' : 'Sign & Verify'}</button>
    </form>
  );
}
