import React, { useState } from 'react';
import { ethers } from 'ethers';

const TRUSTLESS_VERIFIER_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// ABI for TrustlessVerifier contract
const TRUSTLESS_VERIFIER_ABI = [
  "function registerKey(bytes32 publicKeyHash) external",
];

export default function RegisterPQKey({ signer }) {
  const [publicKeyHash, setPublicKeyHash] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [error, setError] = useState(null);

  // Handle public key hash input
  const handlePublicKeyHashChange = (e) => {
    setPublicKeyHash(e.target.value);
  };

  // Register public key hash on-chain
  const registerKey = async () => {
    if (!publicKeyHash || !signer) {
      setError('Please enter a public key hash and connect your wallet');
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      // Create contract instance
      const contract = new ethers.Contract(
        TRUSTLESS_VERIFIER_ADDRESS,
        TRUSTLESS_VERIFIER_ABI,
        signer
      );

      // Format the public key hash
      const formattedHash = publicKeyHash.startsWith('0x') 
        ? publicKeyHash 
        : '0x' + publicKeyHash;

      // Register the key
      const tx = await contract.registerKey(formattedHash);
      const receipt = await tx.wait();

      setRegistrationResult({
        success: true,
        txHash: receipt.transactionHash
      });

    } catch (err) {
      console.error('Error registering key:', err);
      setError(err.message);
      setRegistrationResult({
        success: false
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Generate a new key pair using the RISC Zero wallet CLI
  const generateKeyPair = async () => {
    setError('To generate a new key pair, use the Dilithium wallet CLI:');
    setError('./target/release/dilithium-wallet keygen -o keypair.json');
  };

  return (
    <div className="register-key">
      <h2>Register Dilithium-5 Public Key</h2>
      
      <div className="key-generation">
        <h3>Step 1: Generate Key Pair</h3>
        <p>Generate a Dilithium-5 key pair using the wallet CLI:</p>
        <pre>./target/release/dilithium-wallet keygen -o keypair.json</pre>
        <p>Then extract the public key hash:</p>
        <pre>./target/release/dilithium-wallet export-pk -k keypair.json -o public_key.bin</pre>
        <button 
          onClick={generateKeyPair}
          className="btn-primary"
        >
          Generate Key Pair
        </button>
      </div>
      
      <div className="key-registration">
        <h3>Step 2: Register Public Key Hash</h3>
        <div className="input-group">
          <label>Public Key Hash (32 bytes):</label>
          <input 
            type="text" 
            value={publicKeyHash} 
            onChange={handlePublicKeyHashChange}
            placeholder="Enter public key hash (hex)"
          />
        </div>
        
        <button 
          onClick={registerKey} 
          disabled={isRegistering || !signer}
          className="btn-secondary"
        >
          {isRegistering ? 'Registering...' : 'Register Key'}
        </button>
      </div>
      
      {registrationResult && registrationResult.success && (
        <div className="success-message">
          <p>✅ Key registered successfully!</p>
          <p>Transaction Hash: {registrationResult.txHash}</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      <style jsx>{`
        .register-key {
          margin-bottom: 20px;
        }
        
        .key-generation, .key-registration {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #eee;
          border-radius: 4px;
        }
        
        pre {
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          font-family: monospace;
        }
        
        .input-group {
          margin-bottom: 15px;
        }
        
        .input-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .input-group input {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: monospace;
        }
        
        .btn-primary, .btn-secondary {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-right: 10px;
        }
        
        .btn-primary {
          background-color: #007bff;
          color: white;
        }
        
        .btn-secondary {
          background-color: #28a745;
          color: white;
        }
        
        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .success-message {
          margin-top: 15px;
          padding: 10px;
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 4px;
          color: #155724;
        }
        
        .error-message {
          margin-top: 15px;
          padding: 10px;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          color: #721c24;
        }
      `}</style>
    </div>
  );
}