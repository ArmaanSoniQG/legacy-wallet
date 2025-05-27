import { useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import { FACTORY_ADDR, ABI as F_ABI } from '../factory.js';
import Toast from './Toast.jsx';

export default function DeployWallet({ onReady }) {
  const [busy, setBusy]     = useState(false);
  const [err,  setErr ]     = useState('');
  const [msg,  setToastMsg] = useState('');

  async function handle() {
    if (busy) return;
    setBusy(true); setErr('');

    try {
      if (!window.ethereum) throw new Error('MetaMask required');

      const prov    = new BrowserProvider(window.ethereum);
      const signer  = await prov.getSigner();
      const me      = await signer.getAddress();
      const factory = new Contract(FACTORY_ADDR, F_ABI, signer);

      /* ── 0. Does a verifier already exist? ───────────────────── */
      const existing = await factory.verifierOf(me);
      if (existing !== '0x0000000000000000000000000000000000000000') {
        localStorage.setItem('verifierAddr', existing);
        setToastMsg('Found existing verifier ✔︎');
        onReady(existing);
        return;                                  // ← skip deploy
      }

      /* ── 1. Deploy fresh verifier ────────────────────────────── */
      const tx  = await factory.deploy();
      const rc  = await tx.wait(1);

      const ev = rc.logs.find(l => l.fragment?.name === 'VerifierDeployed');
      const addr = ev?.args.verifier;
      if (!addr) throw new Error('Factory event not found');

      localStorage.setItem('verifierAddr', addr);
      setToastMsg('Verifier deployed 🎉');
      onReady(addr);

    } catch (e) {
      setErr(e.message ?? String(e));

    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 relative">
      {msg && <Toast msg={msg} onDone={() => setToastMsg('')} />}
      {err && <div className="text-red-600 mb-2">{err}</div>}

      <button
        onClick={handle}
        className="bg-indigo-700 text-white px-3 py-1 rounded disabled:opacity-50"
        disabled={busy}
      >
        {busy ? 'Deploying…' : 'Create my QuantaSeal Wallet'}
      </button>
    </div>
  );
}
