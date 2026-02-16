// Connect Wallet Button Component
'use client';

import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';

export interface ConnectWalletButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  showChainInfo?: boolean;
}

export const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({
  className = '',
  variant = 'primary',
  size = 'md',
  showChainInfo = true,
}) => {
  const { isConnected, isConnecting, userAddress, currentChain, isCorrectNetwork, connectWallet, error } = useWallet();
  const [showAddressMenu, setShowAddressMenu] = useState(false);

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  const shortenAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses: Record<string, string> = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-800 text-white',
    outline: 'border border-gray-500 hover:border-gray-400 text-gray-300',
  };

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            rounded-lg font-semibold transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
        {error && (
          <div className="absolute top-full mt-2 bg-red-900 text-red-100 p-2 rounded text-sm max-w-xs">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowAddressMenu(!showAddressMenu)}
        className={`
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          rounded-lg font-semibold transition-colors duration-200
          flex items-center gap-2
          ${className}
        `}
      >
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        {shortenAddress(userAddress || '')}
      </button>

      {showAddressMenu && (
        <div className="absolute top-full mt-2 right-0 bg-gray-900 border border-gray-700 rounded-lg p-3 z-50 min-w-max">
          <div className="text-sm text-gray-400 mb-2">Connected Address:</div>
          <div className="text-white font-mono text-sm break-all mb-3">{userAddress}</div>

          {showChainInfo && (
            <div className="text-sm text-gray-400 mb-2">Network:</div>
          )}
          {showChainInfo && (
            <div className={`text-sm font-semibold mb-3 ${isCorrectNetwork ? 'text-green-400' : 'text-red-400'}`}>
              {currentChain === 84532 ? '✓ Base Sepolia' : currentChain === 8453 ? '✓ Base Mainnet' : '✗ Wrong Network'}
            </div>
          )}

          <button
            onClick={() => {
              navigator.clipboard.writeText(userAddress || '');
              setShowAddressMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800 rounded text-gray-300 hover:text-white transition"
          >
            Copy Address
          </button>
        </div>
      )}

      <div
        className="fixed inset-0 z-40"
        onClick={() => setShowAddressMenu(false)}
        style={{ display: showAddressMenu ? 'block' : 'none' }}
      />
    </div>
  );
};

export default ConnectWalletButton;
