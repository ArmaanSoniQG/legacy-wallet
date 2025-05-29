import React, { useContext, useState } from 'react';
import { EthereumProvider, EthereumContext } from './context/EthereumContext';
import RegisterPQKey   from './components/RegisterPQKey';
import SendTransaction from './components/SendTransaction';

function InnerApp() {
  const { ready, connect } = useContext(EthereumContext);
  const [pqPriv, setPriv]  = useState(null);

  if (!ready) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">QuantaSeal · Hybrid Wallet</h1>
        <button className="btn btn-primary mt-4" onClick={connect}>
          Connect MetaMask
        </button>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">QuantaSeal · Hybrid Wallet</h1>
      <RegisterPQKey onReady={setPriv} />
      {pqPriv && <SendTransaction dilithiumPriv={pqPriv} />}
    </main>
  );
}

export default function App() {
  return (
    <EthereumProvider>
      <InnerApp/>
    </EthereumProvider>
  );
}
