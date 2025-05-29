import React, { useState, useContext } from 'react';
import { EthereumContext } from '../context/EthereumContext.jsx';
import {
  generateKeyPair,
  sign,
  verify,
  fmt,
  createRegisterMsg
} from '../lib/pqcrypto';
import { ethers } from 'ethers';

/* choose Dilithium parameter set the contract expects */
const ALGO_ID = 0;             // Dilithium enum value
const PARAM   = 'dilithium5';  // change if contract wants dilithium3 etc.

export default function RegisterPQKey({ onReady, disabled }) {
  const { contract, user } = useContext(EthereumContext);

  const [pair, setPair] = useState(null);
  const [busy, setBusy] = useState(false);
  const [log,  setLog]  = useState('');

  /* ------------ helpers ------------ */
  const gen = async () => {
    try {
      setBusy(true); setLog('generating key…');
      const kp = await generateKeyPair(PARAM);       // param set explicit
      setPair(kp);
      setLog(`key: ${fmt(kp.publicKey)}`);
      onReady?.(kp.privateKey);
    } finally { setBusy(false); }
  };

  const register = async () => {
    if (!pair) return;

    try {
      setBusy(true); setLog('signing proof…');
      const msgHash = createRegisterMsg(contract.target, user); // owner,wallet
      const sig     = await sign(pair.privateKey, msgHash);

      /* sanity-check locally */
      if (!(await verify(pair.publicKey, msgHash, sig))) {
        throw new Error('local Dilithium verify failed');
      }

      const pubHex = ethers.hexlify(pair.publicKey);
      const sigHex = ethers.hexlify(sig);

      console.log(
  'Dilithium pub-len:', pair.publicKey.length,
  'sig-len:',          sig.length
);

      /* ---------- dry-run with callStatic ---------- */
      setLog('static-calling to capture revert…');
      try {
  await contract.registerPQKey.staticCall(ALGO_ID, pubHex, sigHex);
} catch (e) {
  console.error('Raw revert data:', e.data);
  if (e.errorName) console.error('Custom error:', e.errorName);
  throw new Error('contract reverted - see console for raw data');
}


      /* ---------- real tx ---------- */
      setLog('sending tx…');
      const tx = await contract.registerPQKey(ALGO_ID, pubHex, sigHex);
      await tx.wait();
      setLog('✅ registered!');
    } catch (e) {
      setLog(`❌ ${e.message}`);
    } finally { setBusy(false); }
  };

  /* ------------ UI ------------ */
  return (
    <section className="card p-4 space-y-2">
      <h3 className="text-lg font-semibold">Step 1 · Quantum Key</h3>

      {!pair && (
        <button
          className="btn btn-secondary"
          disabled={busy || disabled || !contract}
          onClick={gen}
        >
          {busy ? 'please wait…' : 'Generate key'}
        </button>
      )}

      {pair && (
        <>
          <p>pub: {fmt(pair.publicKey)}</p>
          <button
            className="btn btn-primary"
            disabled={busy || disabled}
            onClick={register}
          >
            {busy ? 'pending…' : 'Register on chain'}
          </button>
        </>
      )}

      {log && <p className="text-sm italic break-all">{log}</p>}
    </section>
  );
}
