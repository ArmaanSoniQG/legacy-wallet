import React, { useState } from 'react';
import { ethers } from 'ethers';

export default function App() {
  const [connected, setConnected] = useState(false);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      console.log('🔑 Starting key generation...');
      
      // Step 1: Generate keys
      const keyResponse = await fetch('http://localhost:4000/generate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Key response status:', keyResponse.status);
      
      if (!keyResponse.ok) {
        const errorText = await keyResponse.text();
        throw new Error(`Key generation failed: ${keyResponse.status} - ${errorText}`);
      }
      
      const keyData = await keyResponse.json();
      console.log('✅ Keys generated, hash:', keyData.publicKeyHash?.slice(0, 16) + '...');
      
      // Step 2: Generate proof (30s local proving)
      console.log('🚀 Starting proof generation...');
      
      // Get private key for Boundless (MetaMask doesn't expose this directly)
      // Using real private key with Sepolia ETH - in production, use proper key management
      const testPrivateKey = '0xa8d7b5049c2004e397a5fa3dcf905d121ac02fa8b74e068d421e080c8b459efd';
      
      const proofResponse = await fetch('http://localhost:4000/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'session_' + Date.now(),
          privateKey: testPrivateKey
        })
      });
      
      console.log('Proof response status:', proofResponse.status);
      
      if (!proofResponse.ok) {
        const errorText = await proofResponse.text();
        throw new Error(`Proof generation failed: ${proofResponse.status} - ${errorText}`);
      }
      
      const proofData = await proofResponse.json();
      const provider = proofData.proof?.provider || 'unknown';
      console.log(`✅ Proof generated successfully via ${provider}`);
      
      setSessionActive(true);
      setLoading(false);
      
    } catch (err) {
      console.error('Session creation error:', err);
      setError('Session creation failed: ' + err.message);
      setLoading(false);
    }
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
            {loading ? 'Creating Session (Boundless → Local)...' : 'Create Session (Boundless Proving)'}
          </button>
        </div>
      )}
      
      {sessionActive && (
        <div className="bg-green-100 p-4 rounded">
          <p className="text-green-800">✅ Session Active - Transactions now instant!</p>
        </div>
      )}
      
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}