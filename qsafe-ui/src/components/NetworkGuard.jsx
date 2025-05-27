// src/components/NetworkGuard.jsx
import { useEffect, useState } from 'react';

export default function NetworkGuard({ children }) {
  const [ok, setOk] = useState(true);

  useEffect(() => {
    async function check() {
      if (!window.ethereum) return;
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setOk(chainId === '0xaa36a7');   // Sepolia
    }
    check();
    window.ethereum.on('chainChanged', () => window.location.reload());
  }, []);

  return ok ? children :
    <div className="p-6 text-center">
      ❌ Please switch MetaMask to <b>Sepolia</b>.
    </div>;
}
