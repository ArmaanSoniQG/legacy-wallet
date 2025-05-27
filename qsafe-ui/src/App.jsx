// qsafe-ui/src/App.jsx
import { useEffect, useState } from 'react';
import { Toaster }            from 'sonner';

import DeployWallet from './components/DeployWallet.jsx';
import RegisterPQ   from './components/RegisterPQ.jsx';
import MessageForm  from './components/MessageForm.jsx';
import ResultCard   from './components/ResultCard.jsx';

export default function App() {
  /* ▲  Multi-wallet safety (unchanged) */
  useEffect(() => {
    const { ethereum } = window;
    if (!ethereum) return;
    const h = () => {
      localStorage.removeItem('verifierAddr');
      window.location.reload();
    };
    ethereum.on('accountsChanged', h);
    return () => ethereum.removeListener('accountsChanged', h);
  }, []);

  /* ▸ verifier address (null → needs deploying) */
  const [verifierAddr, setVerifierAddr] = useState(
    localStorage.getItem('verifierAddr') ?? null,
  );

  /* ▸ demo result card */
  const [res, setRes] = useState(null);

  return (
    <>
      <Toaster richColors position="top-center" />

      <div className="max-w-xl mx-auto p-6 font-mono">
        <h1 className="text-2xl mb-4">QuantaSeal Hybrid Demo</h1>

        {!verifierAddr ? (
          /* wallet not yet deployed – show the blue button */
          <DeployWallet onReady={addr => setVerifierAddr(addr)} />
        ) : (
          /* already deployed → show a disabled tick button */
          <button
            disabled
            className="mb-4 bg-green-600/20 text-green-800 px-3 py-1 rounded cursor-default"
          >
            ✓ Wallet deployed
          </button>
        )}

        {/* pass the address to children – key point! */}
        <RegisterPQ  verifierAddr={verifierAddr} />
        <MessageForm verifierAddr={verifierAddr} onDone={setRes} />

        {res && <ResultCard {...res} />}
      </div>
    </>
  );
}
