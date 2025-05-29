import React, { useState, useContext } from 'react';
import { EthereumContext } from '../context/EthereumContext';
import {
  sign,
  createTxMessage
} from '../lib/pqcrypto';

/**
 * Minimal “send ETH” form secured by PQ signature.
 * Assumes the Dilithium privateKey is still in memory; in
 * real use you would retrieve/decrypt it from secure storage.
 */
export default function SendTransaction({ dilithiumPriv }) {
  const { contract }        = useContext(EthereumContext);
  const [to, setTo]         = useState('');
  const [amount, setAmt]    = useState('');
  const [busy, setBusy]     = useState(false);
  const [msg,  setMsg]      = useState('');

  const submit = async () => {
    setBusy(true); setMsg('Preparing PQ signature…');
    try {
      const valueWei = BigInt(Math.floor(Number(amount) * 1e18));
      const nonce    = await contract.txNonce();
      const message  = createTxMessage(
        contract.address, to, valueWei, '0x', nonce
      );
      const pqSig    = await sign(dilithiumPriv, message, 'Dilithium');

      setMsg('Sending executeTransaction tx…');
      const tx = await contract.executeTransaction(to, valueWei, '0x', pqSig);
      await tx.wait();
      setMsg('✅ success!');
    } catch (e) {
      setMsg(`❌ failed: ${e.reason || e.message}`);
    } finally { setBusy(false); }
  };

  return (
    <section className="card p-4">
      <h3 className="text-xl mb-2">Step 2 · Send Transaction</h3>
      <input
        className="input"
        placeholder="Recipient 0x…"
        value={to}
        onChange={e => setTo(e.target.value)}
      />
      <input
        className="input mt-2"
        placeholder="Amount ETH"
        value={amount}
        onChange={e => setAmt(e.target.value)}
      />
      <button
        className="btn btn-primary mt-3"
        disabled={busy || !to || !amount}
        onClick={submit}
      >
        {busy ? 'Working…' : 'Send'}
      </button>

      {msg && <p className="mt-2 italic">{msg}</p>}
    </section>
  );
}
