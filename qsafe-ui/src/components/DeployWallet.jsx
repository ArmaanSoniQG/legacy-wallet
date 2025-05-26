import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { FACTORY_ADDR, ABI as F_ABI } from '../factory.js';

export default function DeployWallet({ onReady }) {
  const [busy, setBusy] = useState(false);
  const [err,  setErr ] = useState('');

  async function handle() {
    try {
      setBusy(true); setErr('');
      if (!window.ethereum) throw new Error('MetaMask required');

      const prov    = new BrowserProvider(window.ethereum);
      const signer  = await prov.getSigner();
      const factory = new Contract(FACTORY_ADDR, F_ABI, signer);

      // 1. send tx
      const tx = await factory.deploy();
      const rc = await tx.wait(1);   // wait 1 block

      // 2. read emitted address
      const ev = rc.logs.find(l => l.fragment?.name === 'VerifierDeployed');
      const verifierAddr = ev?.args.verifier;
      if (!verifierAddr) throw new Error('factory event not found');

      // 3. persist + notify parent
      localStorage.setItem('verifierAddr', verifierAddr);
      onReady(verifierAddr);
    } catch (e) {
      setErr(e.message ?? String(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="mb-4">
      {err && <div className="text-red-600 mb-2">{err}</div>}
      <button
        onClick={handle}
        className="bg-indigo-700 text-white px-3 py-1 rounded"
        disabled={busy}
      >
        {busy ? 'Deploying…' : 'Create my QuantaSeal Wallet'}
      </button>
    </div>
  );
}
