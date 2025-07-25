import React, { useState } from 'react';
import { ethers } from 'ethers';

const ZKVM_SERVICE_URL = 'http://localhost:3001';
const TRUSTLESS_VERIFIER_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// ABI for TrustlessVerifier contract
const TRUSTLESS_VERIFIER_ABI = [
  "function verifySignature(bytes calldata journal, bytes calldata seal) external returns (tuple(bool isValid, bytes32 publicKeyHash, bytes32 messageHash))",
  "function registerKey(bytes32 publicKeyHash) external",
  "function executeTransaction(bytes calldata journal, bytes calldata seal, address target, uint256 value, bytes calldata data) external returns (bool success)"
];

export default function RiscZeroVerification({ signer, publicKey, signature, message }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [proof, setProof] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  const generateZkProof = async () => {
    if (!publicKey || !signature || !message) {
      setError('Missing required data: publicKey, signature, or message');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Call zkVM service to generate proof
      const response = await fetch(`${ZKVM_SERVICE_URL}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: publicKey,
          signature: signature,
          message: message,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate proof');
      }

      setProof(result.proof);
      console.log('ZK Proof generated:', result.proof);

    } catch (err) {
      console.error('Error generating ZK proof:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const verifyOnChain = async () => {
    if (!proof || !signer) {
      setError('No proof available or signer not connected');
      return;
    }

    try {
      const contract = new ethers.Contract(
        TRUSTLESS_VERIFIER_ADDRESS,
        TRUSTLESS_VERIFIER_ABI,
        signer
      );

      // Convert hex strings to bytes
      const journalBytes = ethers.utils.arrayify('0x' + proof.journal);
      const sealBytes = ethers.utils.arrayify('0x' + proof.seal);

      console.log('Verifying on-chain...');
      const tx = await contract.verifySignature(journalBytes, sealBytes);
      const receipt = await tx.wait();

      // Extract verification result from transaction receipt
      const event = receipt.events?.find(e => e.event === 'SignatureVerified');
      if (event) {
        setVerificationResult({
          isValid: event.args.isValid,
          publicKeyHash: event.args.publicKeyHash,
          messageHash: event.args.messageHash,
          txHash: receipt.transactionHash
        });
      }

      console.log('On-chain verification completed:', receipt);

    } catch (err) {
      console.error('Error verifying on-chain:', err);
      setError(err.message);
    }
  };

  const registerKey = async () => {
    if (!proof || !signer) {
      setError('No proof available or signer not connected');
      return;
    }

    try {
      const contract = new ethers.Contract(
        TRUSTLESS_VERIFIER_ADDRESS,
        TRUSTLESS_VERIFIER_ABI,
        signer
      );

      console.log('Registering key on-chain...');
      const tx = await contract.registerKey(proof.publicKeyHash);
      const receipt = await tx.wait();

      console.log('Key registered:', receipt);
      alert('Key registered successfully!');

    } catch (err) {
      console.error('Error registering key:', err);
      setError(err.message);
    }
  };

  return (
    <div className="risc-zero-verification">
      <h3>RISC Zero zkVM Verification</h3>
      
      <div className="verification-steps">
        <div className="step">
          <h4>Step 1: Generate ZK Proof</h4>
          <button 
            onClick={generateZkProof} 
            disabled={isGenerating || !publicKey || !signature || !message}
            className="btn-primary"
          >
            {isGenerating ? 'Generating Proof...' : 'Generate ZK Proof'}
          </button>
          
          {proof && (
            <div className="proof-info">
              <p>✅ Proof generated successfully!</p>
              <p>Valid: {proof.isValid ? 'Yes' : 'No'}</p>
              <p>Public Key Hash: {proof.publicKeyHash}</p>
              <p>Message Hash: {proof.messageHash}</p>
            </div>
          )}
        </div>

        <div className="step">
          <h4>Step 2: Verify On-Chain</h4>
          <button 
            onClick={verifyOnChain} 
            disabled={!proof || !signer}
            className="btn-secondary"
          >
            Verify on Blockchain
          </button>
          
          {verificationResult && (
            <div className="verification-result">
              <p>✅ On-chain verification completed!</p>
              <p>Valid: {verificationResult.isValid ? 'Yes' : 'No'}</p>
              <p>TX Hash: {verificationResult.txHash}</p>
            </div>
          )}
        </div>

        <div className="step">
          <h4>Step 3: Register Key (Optional)</h4>
          <button 
            onClick={registerKey} 
            disabled={!proof || !signer}
            className="btn-tertiary"
          >
            Register Public Key
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>❌ Error: {error}</p>
        </div>
      )}

      <style jsx>{`
        .risc-zero-verification {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        
        .verification-steps {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .step {
          border: 1px solid #eee;
          border-radius: 4px;
          padding: 15px;
        }
        
        .btn-primary, .btn-secondary, .btn-tertiary {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .btn-primary {
          background-color: #007bff;
          color: white;
        }
        
        .btn-secondary {
          background-color: #28a745;
          color: white;
        }
        
        .btn-tertiary {
          background-color: #ffc107;
          color: black;
        }
        
        .btn-primary:disabled, .btn-secondary:disabled, .btn-tertiary:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .proof-info, .verification-result {
          margin-top: 10px;
          padding: 10px;
          background-color: #f8f9fa;
          border-radius: 4px;
        }
        
        .error-message {
          margin-top: 10px;
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