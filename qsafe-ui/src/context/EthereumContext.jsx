// qsafe-ui/src/context/EthereumContext.jsx
import React, { createContext, useEffect, useState } from 'react';
import {
  BrowserProvider,
  Contract,
  ethers,
  ZeroAddress,          // <-- must import
} from 'ethers';

import factoryArtifact from '../abi/HybridWalletFactory.json';
import walletArtifact  from '../abi/HybridWallet.json';

export const EthereumContext = createContext(null);

/* ---------- constants & runtime sanity ---------- */
const FACTORY = import.meta.env.VITE_FACTORY_ADDRESS?.toLowerCase();

if (!FACTORY || FACTORY === '0x' || FACTORY === ZeroAddress) {
  // eslint-disable-next-line no-alert
  alert(
    'VITE_FACTORY_ADDRESS is missing or zero.\n' +
    '1) Did you deploy the factory WITH --broadcast?\n' +
    '2) Did you copy its address into qsafe-ui/.env ?'
  );
}

/* ---------- provider component ---------- */
export const EthereumProvider = ({ children }) => {
  const [state, setState] = useState({
    provider: null,
    signer:   null,
    contract: null,
    user:     null,
    ready:    false,
  });

  /* one-shot MetaMask connect */
  const connect = async () => {
    if (!window.ethereum) {
      alert('No MetaMask / EVM wallet detected'); return;
    }
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const prov   = new BrowserProvider(window.ethereum);
    const signer = await prov.getSigner();
    const user   = await signer.getAddress();

    /* factory instance */
    const factory = new Contract(FACTORY, factoryArtifact.abi, signer);

    /* fetch / create personal HybridWallet */
    let walletAddr = await factory.walletOf(user);
    if (walletAddr === ZeroAddress) {
      console.log('[QuantaSeal] first connect → creating wallet…');
      const tx  = await factory.createWallet();   // MetaMask pops here
      const rc  = await tx.wait();
      walletAddr = rc.logs[0].args.wallet;
    }

    const wallet = new Contract(walletAddr, walletArtifact.abi, signer);

    setState({
      provider: prov,
      signer,
      contract: wallet,
      user,
      ready: true,
    });
  };

  /* auto-connect if already authorised */
  useEffect(() => {
    if (window.ethereum?.selectedAddress) connect();
    window.ethereum?.on('accountsChanged', () => window.location.reload());
    return () => window.ethereum?.removeListener('accountsChanged', () => {});
  }, []);

  return (
    <EthereumContext.Provider value={{ ...state, connect }}>
      {children}
    </EthereumContext.Provider>
  );
};
