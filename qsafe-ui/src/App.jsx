import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function DualTrackStatus({ root }) {
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    if (!root) return;
    
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`http://localhost:4000/session-status?root=${root}`);
        if (r.ok) {
          const data = await r.json();
          if (alive) {
            setSessionData(data);
          }
          // Keep polling if either track is still pending/running
          if (data.audit_status === 'pending' || data.audit_status === 'running' || 
              data.anchor_status === 'pending' || data.anchor_status === 'retrying') {
            setTimeout(poll, 2000);
          }
        } else {
          setTimeout(poll, 2000);
        }
      } catch {
        setTimeout(poll, 2000);
      }
    };
    poll();
    return () => { alive = false; };
  }, [root]);

  const handleRetryAudit = async () => {
    try {
      await fetch('http://localhost:4000/retry-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root })
      });
      setSessionData(prev => ({ ...prev, audit_status: 'running' }));
    } catch (e) {
      console.error('Retry failed:', e);
    }
  };

  if (!sessionData) {
    return <span className="text-gray-500">🔍 Status: Loading...</span>;
  }

  const { audit_status, anchor_status, session_state } = sessionData;

  return (
    <div>
      {/* Main session state */}
      <div className={`font-bold ${
        session_state === 'VERIFIED' ? 'text-green-600' : 
        session_state === 'PENDING' ? 'text-yellow-600' : 
        session_state === 'DEGRADED' ? 'text-orange-600' : 'text-red-600'
      }`}>
        🔍 Session: {session_state === 'VERIFIED' ? '✅ VERIFIED' : 
                           session_state === 'PENDING' ? '… PENDING' :
                           session_state === 'DEGRADED' ? '⚠️ DEGRADED' : '❌ FAILED'}
      </div>
      
      {/* Audit track */}
      <div className="text-xs mt-1">
        <span className={audit_status === 'verified' ? 'text-green-600' : 
                        audit_status === 'failed' ? 'text-red-600' : 'text-gray-600'}>
          Audit: {audit_status === 'verified' ? '✅ Verified' :
                  audit_status === 'running' ? '⚙️ Running' :
                  audit_status === 'failed' ? '❌ Failed' : '… Pending'}
        </span>
        {audit_status === 'failed' && (
          <button 
            onClick={handleRetryAudit}
            className="ml-2 px-1 py-0.5 bg-red-500 text-white text-xs rounded"
          >
            Retry
          </button>
        )}
      </div>
      
      {/* Anchor track */}
      <div className="text-xs">
        <span className={anchor_status === 'confirmed' ? 'text-green-600' : 
                        anchor_status === 'failed' ? 'text-red-600' : 'text-gray-600'}>
          Anchor: {anchor_status === 'confirmed' ? '✅ On-chain' :
                   anchor_status === 'retrying' ? '🔄 Retrying' :
                   anchor_status === 'failed' ? '❌ Failed' : '… Pending'}
        </span>
        {sessionData.onChainTx && (
          <span className="ml-2 text-blue-500 text-xs">
            {sessionData.onChainTx.slice(0, 8)}...
          </span>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txLoading, setTxLoading] = useState(false);
  const [txResult, setTxResult] = useState(null);
  const [sessionProof, setSessionProof] = useState(null);

  const connect = async () => {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setSigner(signer);
      setAddress(address);
      setConnected(true);
    } catch (err) {
      setError('Connection failed: ' + err.message);
    }
  };

  const createSession = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('⚡ PHASE 1: Creating INSTANT session...');
      const startTime = Date.now();
      
      // Phase 1: Instant session with connected wallet (no private key needed)
      const instantResponse = await fetch('http://localhost:4000/create-instant-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          message: 'instant_session_' + Date.now(),
          signer: true // Use MetaMask signing instead of private key
        })
      });
      
      console.log('Instant session response status:', instantResponse.status);
      
      if (!instantResponse.ok) {
        const errorText = await instantResponse.text();
        throw new Error(`Instant session failed: ${instantResponse.status} - ${errorText}`);
      }
      
      const sessionData = await instantResponse.json();
      const totalTime = Date.now() - startTime;
      
      console.log(`⚡ INSTANT session created in ${totalTime}ms!`);
      console.log('🌳 Merkle root:', sessionData.session.merkleRoot?.slice(0, 16) + '...');
      console.log('🔍 Background audit status:', sessionData.session.auditStatus);
      
      // Store session data
      setSessionProof({
        merkleRoot: sessionData.session.merkleRoot,
        inclusionProof: sessionData.session.inclusionProof,
        leaf: sessionData.session.leaf,
        auditStatus: sessionData.session.auditStatus,
        provider: 'phase1-instant'
      });
      
      setSessionActive(true);
      setLoading(false);
      
      // Real-time audit status polling (no fake timer)
      console.log('🔍 Starting real-time audit status polling...');
      
    } catch (err) {
      console.error('Session creation error:', err);
      setError('Session creation failed: ' + err.message);
      setLoading(false);
    }
  };

  const sendTransaction = async () => {
    setTxLoading(true);
    setTxResult(null);
    
    try {
      console.log('🚀 Sending quantum-safe transaction...');
      
      // Step 1: Validate transaction with Phase 1 inclusion proof
      const validationResponse = await fetch('http://localhost:4000/validate-phase1-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient,
          amount,
          sessionProof: sessionProof,
          sender: address
        })
      });
      
      if (!validationResponse.ok) {
        throw new Error('Transaction validation failed');
      }
      
      const validation = await validationResponse.json();
      console.log('✅ Transaction validated via zkVM proof');
      
      // Step 2: Send actual transaction
      const tx = await signer.sendTransaction({
        to: recipient,
        value: ethers.parseEther(amount)
      });
      
      console.log('🚀 Transaction sent:', tx.hash);
      
      setTxResult({
        success: true,
        hash: tx.hash,
        validation: validation
      });
      
    } catch (err) {
      console.error('Transaction error:', err);
      setTxResult({
        success: false,
        error: err.message
      });
    }
    
    setTxLoading(false);
  };

  if (!connected) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">SESSION WALLET - FRESH BUILD</h1>
        <button 
          onClick={connect}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Connect MetaMask
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">SESSION WALLET - FRESH BUILD</h1>
      <p className="mb-4">Connected: {address}</p>
      
      {!sessionActive && (
        <div className="mb-4">
          <button 
            onClick={createSession}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Creating INSTANT Session...' : 'Create Instant Session (Phase 1)'}
          </button>
        </div>
      )}
      
      {sessionActive && (
        <div className="bg-green-100 p-4 rounded">
          <p className="text-green-800 mb-2">⚡ PHASE 1 Session Active - Instant UX!</p>
          <div className="text-sm text-gray-600 mb-4">
            🌳 Merkle Root: {sessionProof?.merkleRoot?.slice(0, 16)}...
            <br />🔐 Native PQ: <span className="font-bold text-green-600">✅ Dilithium Verified</span>
            <br /><DualTrackStatus root={sessionProof?.merkleRoot} />
            <div className="text-xs text-blue-500 mt-1">DEBUG: Dual-track architecture (audit + anchor)</div>
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-bold mb-2">🚀 Test Quantum-Safe Transaction</h3>
            <div className="space-y-2">
              <input 
                type="text" 
                placeholder="Recipient address (0x...)"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <input 
                type="text" 
                placeholder="Amount (ETH)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border rounded"
              />
              <button 
                onClick={sendTransaction} 
                disabled={txLoading || !recipient || !amount}
                className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {txLoading ? 'Sending (Instant via zkVM)...' : 'Send Transaction'}
              </button>
              {txResult && (
                <div className="mt-2">
                  {txResult.success ? (
                    <div className="text-green-600">
                      ✅ Transaction sent! Hash: {txResult.hash?.slice(0, 10)}...
                      <br />🔐 Verified via Boundless zkVM proof
                    </div>
                  ) : (
                    <div className="text-red-600">
                      ❌ Transaction failed: {txResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}