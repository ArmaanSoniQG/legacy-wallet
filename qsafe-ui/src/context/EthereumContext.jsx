/**
 * EthereumContext – exposes:
 *   { provider, signer, contract, userAddress }
 *
 * Expects .env to define VITE_WALLET_ADDRESS & VITE_RPC_URL.
 */

import React, { createContext, useEffect, useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import walletABI from '../abi/HybridWallet.json';

export const EthereumContext = createContext(null);

export const EthereumProvider = ({ children }) => {
  const [provider, setProvider]     = useState(null);
  const [signer, setSigner]         = useState(null);
  const [contract, setContract]     = useState(null);
  const [userAddress, setUserAddr]  = useState(null);

  // 1. bootstrap provider from window.ethereum
  useEffect(() => {
    if (!window.ethereum) return;
    const prov = new BrowserProvider(window.ethereum);
    setProvider(prov);

    const handleAccounts = async () => {
      const s = await prov.getSigner();
      setSigner(s);
      setUserAddr(await s.getAddress());
      const c = new Contract(
        import.meta.env.VITE_WALLET_ADDRESS,
        walletABI,
        s
      );
      setContract(c);
    };

    window.ethereum.on('accountsChanged', handleAccounts);
    handleAccounts();

    return () => window.ethereum.removeListener('accountsChanged', handleAccounts);
  }, []);

  return (
    <EthereumContext.Provider value={{ provider, signer, contract, userAddress }}>
      {children}
    </EthereumContext.Provider>
  );
};
