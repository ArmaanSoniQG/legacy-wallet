import React, { useState, useContext } from 'react';
import { EthereumContext } from '../context/EthereumContext';
import {
  generateKeyPair,
  sign,
  formatPubKey,
  createRegisterMessage
} from '../lib/pqcrypto';

export default function RegisterPQKey() {
  const { contract, userAddress } = useContext(EthereumContext);
  const [pair, setPair]           = useState(null);
  const [busy, setBusy]           = useState(false);
  const [msg,  setMsg]            = useState('');

  // ---- 1. Generate Dilithium key pair ----
  const gen = async () => {
    setBusy(true); setMsg('Generating Dilithium key…');
    try {
      const kp = await generateKeyPair('Dilithium');
      setPair(kp);
      setMsg(`Key generated: ${formatPubKey(kp.publicKey)}`);
    } catch (e) {
      setMsg(`❌ failed: ${e.message}`);
    } finally { setBusy(false); }
  };

  // ---- 2. Register on-chain ----
  const reg = async () => {
    if (!pair) return;

    setBusy(true); setMsg('Signing proof…');
    try {
      const proof = await sign(
        pair.privateKey,
        createRegisterMessage(contract.address, userAddress),
        'Dilithium'
      );

      setMsg('Sending tx…');
      const tx = await contract.registerPQKey(
        1,               // Algorithm.Dilithium
        pair.publicKey,
        proof
      );
      await tx.wait();
      setMsg('✅ key registered!');
    } catch (e) {
      setMsg(`❌ tx failed: ${e.reason || e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <section className="card p-4">
      <h3 className="text-xl mb-2">Step 1 · Register Quantum Key</h3>

      {!pair && (
        <button disabled={busy} onClick={gen} className="btn btn-secondary">
          {busy ? 'Please wait…' : 'Generate PQ Key'}
        </button>
      )}

      {pair && (
        <>
          <p className="mb-2">PubKey: {formatPubKey(pair.publicKey)}</p>
          <button disabled={busy} onClick={reg} className="btn btn-primary">
            {busy ? 'Registering…' : 'Register on chain'}
          </button>
        </>
      )}

      {msg && <p className="mt-3 italic">{msg}</p>}
    </section>
  );
}
