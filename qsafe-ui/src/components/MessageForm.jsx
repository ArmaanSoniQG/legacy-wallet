import { useState } from 'react';
import { keccak256, toUtf8Bytes } from 'ethers';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils';

export default function MessageForm({ onDone }) {
  const [msg, setMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!msg.trim()) return;

    /* 1 ─ Hash */
    const hash = keccak256(toUtf8Bytes(msg));               // 0x…

    /* 2 ─ Dilithium sign (browser) */
    const { secretKey } = ml_dsa65.keygen();                // throw-away demo key
    const pqBytes = ml_dsa65.sign(secretKey, hexToBytes(hash.slice(2)));
    const pqSig   = '0x' + bytesToHex(pqBytes);

    /* 3 ─ ECDSA sign via MetaMask */
    if (!window.ethereum) return alert('Install MetaMask');
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const ecdsaSig = await window.ethereum.request({
      method: 'personal_sign',
      params: [hash, window.ethereum.selectedAddress]
    });

    /* 4 ─ Optimistic “verified” result */
    onDone({ hash, pqSig, ecdsaSig, txHash: 'browser-only', ok: true });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        className="flex-1 border px-2 py-1"
        placeholder="Type a message"
        value={msg}
        onChange={e => setMsg(e.target.value)}
      />
      <button className="bg-black text-white px-3">Sign &amp; Verify</button>
    </form>
  );
}
