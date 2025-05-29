// qsafe-ui/src/components/RegisterPQ.jsx
import { useState } from 'react';
import { BrowserProvider, Contract, keccak256 } from 'ethers';
import { REGISTRY_ADDR, ABI as R_ABI } from '../contract.js';   // ← make sure REGISTRY_ADDR is exported

export default function RegisterPQ({ verifierAddr, onDone }) {
  const [busy, setBusy] = useState(false);
  const [key,  setKey ] = useState('');

  async function handle() {
    if (!key.trim() || busy) return;
    setBusy(true);

    try {
      if (!window.ethereum) throw new Error('MetaMask required');

      const prov     = new BrowserProvider(window.ethereum);
      const signer   = await prov.getSigner();
      const registry = new Contract(REGISTRY_ADDR, R_ABI, signer);

      /* hash the user-supplied PQ key and store it */
      const h = keccak256(Buffer.from(key));
      const tx = await registry.register(h, verifierAddr);
      await tx.wait(1);
      onDone();                                // refresh UI / show toast
    } catch (e) {
      alert(e.message ?? String(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="mb-2 flex gap-2">
      
      <button
        onClick={handle}
        className="bg-black text-white px-3"
        disabled={busy}
      >
        {busy ? 'Waiting…' : 'Register PQ Key'}
      </button>
    </div>
  );
}
