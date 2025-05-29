import React, { useState, useEffect, useContext } from 'react';
import { EthereumContext }           from '../context/EthereumContext';
import { isAddress, parseEther }     from 'ethers';
import { sign, createTxMsg }         from '../lib/pqcrypto';

/**
 * Step 2 – Execute wallet call protected by Dilithium signature.
 *  •  Address and amount are typed (or pasted) by user.
 *  •  Inputs are auto-cleaned: any spaces, punctuation are removed.
 *  •  Button stays disabled until both values are valid.
 */
export default function SendTransaction({ dilithiumPriv }) {
  /* ── pull signer ​*and*​ contract from context ─────────────── */
  const { signer, contract } = useContext(EthereumContext);

  /* signer’s address (wallet owner) – cached in state */
  const [addr, setAddr] = useState('');
  useEffect(() => {
    (async () => {
      if (signer) setAddr(await signer.getAddress());
    })();
  }, [signer]);

  /* ------------------- component state ------------------- */
  const [toRaw, setToRaw] = useState('');    // raw text from input
  const [amt,   setAmt]   = useState('');    // ETH string
  const [busy,  setBusy]  = useState(false);
  const [msg,   setMsg]   = useState('');

  /* ------------------- helpers ------------------- */
  // strip spaces / punctuation so copy-pasted lines like “0xabc…;” work
  const clean = (s) => s.replace(/[^0-9a-fA-Fx]/g, '').trim();
  const to    = clean(toRaw);
  const addrIsOk = isAddress(to);
  const amtIsOk  = !isNaN(amt) && Number(amt) > 0;

  /* ------------------- main send handler ------------------- */
  const send = async () => {
    if (!addrIsOk || !amtIsOk) return;

    try {
      setBusy(true);  setMsg('Building Dilithium signature…');

      // ethers helpers guarantee correct units & types
      const valueWei = parseEther(amt);
      const nonce    = await contract.txNonce(addr);
      const txHash   = createTxMsg(contract.target, to, valueWei, '0x', nonce);
      const pqSig    = await sign(dilithiumPriv, txHash);

      setMsg('Sending executeTransaction via MetaMask…');
      const tx = await contract.executeTransaction(to, '0x', pqSig, { value: valueWei });
      await tx.wait();
      setMsg('✅ Transaction confirmed!');
    } catch (e) {
      setMsg(`❌ ${e.reason ?? e.message}`);
    } finally {
      setBusy(false);
    }
  };

  /* ------------------- JSX ------------------- */
  return (
    <section className="card p-4 space-y-2">
      <h3 className="text-lg font-semibold">Step 2 · Send ETH</h3>

      <input
        className="input"
        placeholder="recipient 0x…"
        value={toRaw}
        onChange={(e) => setToRaw(e.target.value)}
      />

      <input
        className="input"
        placeholder="amount (ETH)"
        value={amt}
        onChange={(e) => setAmt(e.target.value.trim())}
      />

      <button
        className="btn btn-primary"
        disabled={busy || !addrIsOk || !amtIsOk}
        onClick={send}
      >
        {busy ? 'Pending…' : 'Send'}
      </button>

      {msg && <p className="text-sm italic">{msg}</p>}
    </section>
  );
}
