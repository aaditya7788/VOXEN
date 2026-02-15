'use client';

import { useWallet } from '../contexts/WalletContext';
import { useState } from 'react';
import { CHAIN_ID, NETWORK_NAME, BASE_SEPOLIA_CHAIN_ID } from '../contracts/proposalHashOptimized';

export default function NetworkWarning() {
    const { isConnected, currentChain, isCorrectNetwork, switchNetwork } = useWallet();
    const [isSwitching, setIsSwitching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Only show if wallet is connected and on wrong network
    if (!isConnected || isCorrectNetwork) {
        return null;
    }

    const handleSwitchNetwork = async () => {
        setIsSwitching(true);
        setError(null);
        try {
            // Determine if target is testnet based on CHAIN_ID
            const isTestnet = CHAIN_ID === BASE_SEPOLIA_CHAIN_ID;
            await switchNetwork(isTestnet);
        } catch (err: any) {
            setError(err.message || 'Failed to switch network');
        } finally {
            setIsSwitching(false);
        }
    };

    const getNetworkName = (chainId: number | null) => {
        if (!chainId) return 'Unknown';
        const networks: Record<number, string> = {
            1: 'Ethereum Mainnet',
            5: 'Goerli',
            11155111: 'Sepolia',
            8453: 'Base Mainnet',
            84532: 'Base Sepolia',
            137: 'Polygon',
            80001: 'Mumbai',
        };
        return networks[chainId] || `Chain ${chainId}`;
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-3 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <p className="font-semibold text-sm md:text-base">
                            Wrong Network Detected
                        </p>
                        <p className="text-xs md:text-sm opacity-90">
                            You're on <span className="font-medium">{getNetworkName(currentChain)}</span>.
                            Please switch to <span className="font-medium">{NETWORK_NAME}</span> to use blockchain features.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {error && (
                        <p className="text-xs text-red-200">{error}</p>
                    )}
                    <button
                        onClick={handleSwitchNetwork}
                        disabled={isSwitching}
                        className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold text-sm hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {isSwitching ? 'Switching...' : `Switch to ${NETWORK_NAME}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
