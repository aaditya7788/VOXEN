// Wallet Context - Manages Base wallet connection state
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CHAIN_ID } from '../contracts/proposalHashOptimized';


export interface WalletContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  userAddress: string | null;

  // Network state
  currentChain: number | null;
  isCorrectNetwork: boolean;

  // Error state
  error: string | null;

  // Actions
  connectWallet: () => Promise<string>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [currentChain, setCurrentChain] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);


  // Get current chain ID
  const getCurrentChain = useCallback(async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
        const chainIdNum = parseInt(chainId, 16);
        setCurrentChain(chainIdNum);
        return chainIdNum;
      } catch (err) {
        console.error('Error getting chain ID:', err);
      }
    }
    return null;
  }, []);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setUserAddress(accounts[0]);
            setIsConnected(true);
            await getCurrentChain();
          }
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err);
      }
    };

    checkConnection();

    // Listen for account changes
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setIsConnected(false);
          setUserAddress(null);
        } else {
          setUserAddress(accounts[0]);
          setIsConnected(true);
        }
      };

      const handleChainChanged = (chainId: string) => {
        setCurrentChain(parseInt(chainId, 16));
      };

      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
      (window as any).ethereum.on('chainChanged', handleChainChanged);

      return () => {
        (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
        (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [getCurrentChain]);

  const connectWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (typeof window === 'undefined') {
        throw new Error('Wallet connection only works in browser');
      }

      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error('MetaMask or similar Web3 wallet is required');
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      setUserAddress(address);
      setIsConnected(true);
      await getCurrentChain();
      return address;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to connect wallet';
      setError(errorMsg);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [getCurrentChain]);

  const disconnectWallet = useCallback(() => {
    setUserAddress(null);
    setIsConnected(false);
    setError(null);
  }, []);

  const switchNetwork = useCallback(async () => {
    setError(null);
    const targetChainId = CHAIN_ID;
    const isTestnetTarget = targetChainId === 84532;

    const networkConfig = isTestnetTarget
      ? {
        chainId: '0x14a34', // 84532
        chainName: 'Base Sepolia',
        rpcUrls: ['https://sepolia.base.org'],
        blockExplorerUrls: ['https://sepolia-explorer.base.org'],
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      }
      : {
        chainId: '0x2105', // 8453
        chainName: 'Base Mainnet',
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org'],
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      };

    try {
      if (typeof window === 'undefined') return;

      const ethereum = (window as any).ethereum;
      if (!ethereum) return;

      try {
        // Step 1: Try to switch
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networkConfig.chainId }],
        });
        setCurrentChain(targetChainId);
      } catch (switchError: any) {
        // Step 2: If chain not found (4902), add it first
        if (switchError.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig],
          });

          // Step 3: Switch again after adding
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: networkConfig.chainId }],
          });
          setCurrentChain(targetChainId);
        } else {
          throw switchError;
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to switch network';
      // Don't set global error for user rejection to avoid banner spam
      if (err.code !== 4001 && !err.message?.includes('User rejected')) {
        setError(errorMsg);
      }
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if on correct network (strictly enforced based on config)
  const isCorrectNetwork = currentChain === CHAIN_ID;

  const value: WalletContextType = {
    isConnected,
    isConnecting,
    userAddress,
    currentChain,
    isCorrectNetwork,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    clearError,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
