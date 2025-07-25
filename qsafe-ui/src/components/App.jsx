import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import RegisterPQKey from './RegisterPQKey';
import RealDilithiumVerification from './RealDilithiumVerification';
import SimpleSendTransaction from './SimpleSendTransaction';

export default function App() {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [publicKey, setPublicKey] = useState('');
  const [signature, setSignature] = useState('');
  const [message, setMessage] = useState('Hello, post-quantum world!');
  const [activeTab, setActiveTab] = useState('register');

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        setAccount(address);
        setSigner(signer);
      } else {
        alert("Please install MetaMask!");
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
    }
  };

  // Handle public key input
  const handlePublicKeyChange = (e) => {
    setPublicKey(e.target.value);
  };

  // Handle signature input
  const handleSignatureChange = (e) => {
    setSignature(e.target.value);
  };

  // Handle message input
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  // Check if MetaMask is connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const signer = provider.getSigner();
          const address = await signer.getAddress();
          
          setAccount(address);
          setSigner(signer);
        }
      }
    };
    
    checkConnection();
  }, []);

  return (
    <div className="app-container">
      <header>
        <h1>Quantum-Safe Wallet</h1>
        <p>Secure your assets with post-quantum cryptography</p>
        
        {!account ? (
          <button onClick={connectWallet} className="connect-button">
            Connect Wallet
          </button>
        ) : (
          <div className="account-info">
            <span>Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}</span>
          </div>
        )}
      </header>

      <div className="tabs">
        <button 
          className={activeTab === 'register' ? 'active' : ''} 
          onClick={() => setActiveTab('register')}
        >
          Register Key
        </button>
        <button 
          className={activeTab === 'verify' ? 'active' : ''} 
          onClick={() => setActiveTab('verify')}
        >
          Verify Signature
        </button>
        <button 
          className={activeTab === 'send' ? 'active' : ''} 
          onClick={() => setActiveTab('send')}
        >
          Send Transaction
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'register' && (
          <RegisterPQKey signer={signer} />
        )}
        
        {activeTab === 'verify' && (
          <div>
            <h2>Verify Dilithium-5 Signature</h2>
            
            <div className="input-group">
              <label>Public Key (hex):</label>
              <textarea 
                value={publicKey} 
                onChange={handlePublicKeyChange}
                placeholder="Enter Dilithium-5 public key (hex)"
                rows={3}
              />
            </div>
            
            <div className="input-group">
              <label>Signature (hex):</label>
              <textarea 
                value={signature} 
                onChange={handleSignatureChange}
                placeholder="Enter Dilithium-5 signature (hex)"
                rows={3}
              />
            </div>
            
            <div className="input-group">
              <label>Message:</label>
              <input 
                type="text" 
                value={message} 
                onChange={handleMessageChange}
                placeholder="Enter message that was signed"
              />
            </div>
            
            <RealDilithiumVerification 
              signer={signer}
              publicKey={publicKey}
              signature={signature}
              message={message}
            />
          </div>
        )}
        
        {activeTab === 'send' && (
          <SimpleSendTransaction signer={signer} />
        )}
      </div>

      <footer>
        <p>Powered by RISC Zero zkVM & Dilithium-5 Post-Quantum Cryptography</p>
      </footer>

      <style jsx>{`
        .app-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        
        header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 30px;
          text-align: center;
        }
        
        h1 {
          margin-bottom: 10px;
          color: #333;
        }
        
        .connect-button {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 10px;
        }
        
        .account-info {
          background-color: #f1f1f1;
          padding: 10px 15px;
          border-radius: 4px;
          margin-top: 10px;
        }
        
        .tabs {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        
        .tabs button {
          background-color: transparent;
          border: none;
          padding: 10px 20px;
          cursor: pointer;
          font-size: 16px;
          border-bottom: 2px solid transparent;
        }
        
        .tabs button.active {
          border-bottom: 2px solid #4CAF50;
          font-weight: bold;
        }
        
        .tab-content {
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .input-group {
          margin-bottom: 15px;
        }
        
        .input-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .input-group input, .input-group textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: monospace;
        }
        
        footer {
          margin-top: 30px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}