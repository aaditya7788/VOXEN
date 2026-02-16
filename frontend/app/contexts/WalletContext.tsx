
// Wallet Context - Unified Wagmi implementation
'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { CHAIN_ID } from '../contracts/proposalHashOptimized';

export interface WalletContextType {
  isConnected: boolean;
  isConnecting: boolean;
  userAddress: string | null;
  currentChain: number | null;
  isCorrectNetwork: boolean;
  error: string | null;
  connectWallet: () => Promise<string>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const connectWallet = useCallback(async () => {
    try {
      // Find the Coinbase Wallet connector (or first available)
      const connector = connectors.find(c => c.id === 'coinbaseWalletSDK') || connectors[0];
      if (!connector) throw new Error('No wallet connector available');

      const result = await connectAsync({ connector });
      return result.accounts[0];
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      throw err;
    }
  }, [connectAsync, connectors]);

  const disconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const switchNetwork = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: CHAIN_ID });
    } catch (err) {
      console.error('Network switch error:', err);
    }
  }, [switchChainAsync]);

  const value: WalletContextType = useMemo(() => ({
    isConnected,
    isConnecting,
    userAddress: address || null,
    currentChain: chainId || null,
    isCorrectNetwork: chainId === CHAIN_ID,
    error: null, // Error handling can be added if needed via useConnect/useSwitchChain states
    connectWallet,
    disconnectWallet,
    switchNetwork,
    clearError: () => { },
  }), [isConnected, isConnecting, address, chainId, connectWallet, disconnectWallet, switchNetwork]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
