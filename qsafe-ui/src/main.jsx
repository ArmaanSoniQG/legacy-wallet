// qsafe-ui/src/main.jsx
import React, { useEffect } from 'react';
import { createRoot }         from 'react-dom/client';

import App   from './App.jsx';
import './style.css';
// 👇 v2 uses style.css in the package root
//import 'sonner/dist/styles.css';


function Root() {
  useEffect(() => { 
    const { ethereum } = window;
    if (!ethereum) return;

    /* ---------------------------------------------------------
       If MetaMask gives us an account that doesn’t match the
       cached verifier’s owner, wipe the cache and reload.
    --------------------------------------------------------- */
    const check = (accs) => {
      if (!accs.length) return;                     // locked MM
      const current = accs[0].toLowerCase();
      const cachedOwner = localStorage.getItem('ownerECDSA');
      if (cachedOwner && cachedOwner !== current) {
        localStorage.removeItem('verifierAddr');
        localStorage.removeItem('ownerECDSA');
        window.location.reload();                   // hard refresh
      }
    };

    // 1 – initial run
    ethereum.request({ method: 'eth_accounts' }).then(check);

    // 2 – subsequent switches
    ethereum.on('accountsChanged', check);
    return () => ethereum.removeListener('accountsChanged', check);
  }, []);

  return <App />;
}

createRoot(document.getElementById('root')).render(<Root />);
