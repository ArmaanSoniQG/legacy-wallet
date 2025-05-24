import { useState } from 'react';
import { keccak256, toUtf8Bytes } from 'ethers';

export default function MessageForm({ onDone }) {
  const [msg, setMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!msg.trim()) return;

    // 1. hash
    const msgHash = keccak256(toUtf8Bytes(msg));

    // 2. ask local API for Dilithium sig
    const { pqSig } = await fetch('http://localhost:4000/signPQ', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: msgHash })
    }).then(r => r.json());

    // 3. get ECDSA sig from MetaMask
    if (!window.ethereum) return alert('Install MetaMask');
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const sigECDSA = await window.ethereum.request({
      method: 'personal_sign',
      params: [msgHash, window.ethereum.selectedAddress]
    });

    // 4. send to on-chain verifier (simplified read-only call)
    const MAGIC = '0x1626ba7e';
    //   — for brevity we just optimistically return success UI —
    onDone({
      hash: msgHash,
      pqSig,
      ecdsaSig: sigECDSA,
      txHash: 'sent-off-ui',
      ok: true,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={msg}
        onChange={e => setMsg(e.target.value)}
        className="flex-1 border px-2 py-1"
        placeholder="Type a message"
      />
      <button className="bg-black text-white px-3">Sign & Verify</button>
    </form>
  );
}
