import React, { useState } from 'react';
import { ethers } from 'ethers';

export default function SimpleSendTransaction({ signer }) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [txResult, setTxResult] = useState(null);
  const [error, setError] = useState(null);

  // Handle recipient address input
  const handleRecipientChange = (e) => {
    setRecipient(e.target.value);
  };

  // Handle amount input
  const handleAmountChange = (e) => {
    setAmount(e.target.value);
  };

  // Send transaction
  const sendTransaction = async () => {
    if (!recipient || !amount || !signer) {
      setError('Please enter recipient address, amount, and connect your wallet');
      return;
    }

    if (!ethers.utils.isAddress(recipient)) {
      setError('Invalid Ethereum address');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Convert amount to wei
      const amountWei = ethers.utils.parseEther(amount);
      
      // Send transaction
      const tx = await signer.sendTransaction({
        to: recipient,
        value: amountWei
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      setTxResult({
        success: true,
        txHash: receipt.transactionHash
      });
      
    } catch (err) {
      console.error('Error sending transaction:', err);
      setError(err.message);
      setTxResult({
        success: false
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="send-transaction">
      <h2>Send ETH Transaction</h2>
      
      <div className="input-group">
        <label>Recipient Address:</label>
        <input 
          type="text" 
          value={recipient} 
          onChange={handleRecipientChange}
          placeholder="Enter Ethereum address (0x...)"
        />
      </div>
      
      <div className="input-group">
        <label>Amount (ETH):</label>
        <input 
          type="text" 
          value={amount} 
          onChange={handleAmountChange}
          placeholder="Enter amount in ETH"
        />
      </div>
      
      <button 
        onClick={sendTransaction} 
        disabled={isSending || !signer}
        className="send-button"
      >
        {isSending ? 'Sending...' : 'Send Transaction'}
      </button>
      
      {txResult && txResult.success && (
        <div className="success-message">
          <p>✅ Transaction sent successfully!</p>
          <p>Transaction Hash: {txResult.txHash}</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      <style jsx>{`
        .send-transaction {
          margin-bottom: 20px;
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
        }
        
        .send-button {
          background-color: #4CAF50;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        
        .send-button:disabled {
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