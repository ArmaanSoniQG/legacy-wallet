// qsafe-ui/src/components/RegisterPQ.jsx
import { useEffect, useState } from 'react';
import { BrowserProvider, Contract, keccak256 } from 'ethers';
import { ml_dsa65 }           from '@noble/post-quantum/ml-dsa';
import { hexToBytes }         from '@noble/hashes/utils';

import { deriveSeed }                       from '../seed.js';
import { REGISTRY_ADDR, ABI as REG_ABI }    from '../registry.js';

const ZERO32 = '0x' + '0'.repeat(64);

export default function RegisterPQ() {
  /* status = 'idle' | 'busy' | 'registered' | 'none' */
  const [status, setStatus]   = useState('idle');
  const [error,  setError]    = useState('');

  // ────────────────────────────────────────────────
  // 1.  Ask the registry (once) if our wallet is
  //     already in the mapping; update UI accordingly
  // ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (!window.ethereum) return;
      try {
        const prov   = new BrowserProvider(window.ethereum);
        const signer = await prov.getSigner();
        const reg    = new Contract(REGISTRY_ADDR, REG_ABI, prov);
        const stored = await reg.pqKeyOf(signer.address);
        setStatus(stored !== ZERO32 ? 'registered' : 'none');
      } catch (e) {
        console.warn('[Registry check failed]', e);
        setStatus('none');             // safe fallback
      }
    })();
  }, []);

  // ────────────────────────────────────────────────
  // 2.  Click handler
  // ────────────────────────────────────────────────
  async function handle() {
    if (status !== 'none') return;      // already busy / done
    setStatus('busy');  setError('');

    try {
      if (!window.ethereum) throw new Error('MetaMask required');

      /* connect signer */
      const prov    = new BrowserProvider(window.ethereum);
      const signer  = await prov.getSigner();
      const address = await signer.getAddress();
      const reg     = new Contract(REGISTRY_ADDR, REG_ABI, signer);

      /* guard against race-condition re-clicks */
      const current = await reg.pqKeyOf(address);
      if (current !== ZERO32) {
        setStatus('registered');
        return alert('Already registered ✓');
      }

      /* deterministic Dilithium pub-key hash */
      const seedBytes      = hexToBytes((await deriveSeed(address)).slice(2));
      const { publicKey }  = ml_dsa65.keygen(seedBytes);
      const pqHash32       = keccak256(publicKey);          // 0x-hex32

      /* send tx */
      const tx  = await reg.register(pqHash32);
      await tx.wait(1);

      /* persist + notify */
      localStorage.setItem('pqSecretKey', '1');
      setStatus('registered');
      alert('PQ key registered 🎉');
    } catch (e) {
      console.error(e);
      setError(e.reason ?? e.message ?? String(e));
      setStatus('none');
    }
  }

  // ────────────────────────────────────────────────
  // 3.  Render
  // ────────────────────────────────────────────────
  return (
    <>
      {error && (
        <div className="bg-red-100 text-red-800 p-2 mb-2 rounded">
          {error}
        </div>
      )}

      <button
        onClick={handle}
        className="bg-green-700 text-white px-3 py-1 mb-4 rounded
                   disabled:opacity-50"
        disabled={status !== 'none'}
      >
        {status === 'registered' ? '✓ PQ Key Registered'
         : status === 'busy'    ? 'Registering…'
                                : 'Register PQ Key'}
      </button>
    </>
  );
}
