import { Contract } from 'ethers';
import walletABI from './abi/HybridWallet.json';

export const getHybridWallet = (signer) =>
  new Contract(import.meta.env.VITE_WALLET_ADDRESS, walletABI, signer);
