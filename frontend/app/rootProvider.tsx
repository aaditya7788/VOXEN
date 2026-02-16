"use client";
import { ReactNode, useState } from "react";
import { base, baseSepolia } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { AuthProvider } from "./contexts/AuthContext";
import { WalletProvider } from "./contexts/WalletContext";
import NetworkWarning from "./components/NetworkWarning";
import "@coinbase/onchainkit/styles.css";
import { CHAIN_ID, BASE_MAINNET_CHAIN_ID } from "./contracts/proposalHashOptimized";
import { config } from "./wagmi";

const chain = CHAIN_ID === BASE_MAINNET_CHAIN_ID ? base : baseSepolia;

export function RootProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={chain}
          config={{
            appearance: {
              mode: "auto",
            },
            wallet: {
              display: "modal",
              preference: "smartWalletOnly",
            },
          }}
          miniKit={{
            enabled: true,
            autoConnect: true,
          }}
        >

          <AuthProvider>
            <WalletProvider>
              <NetworkWarning />
              {children}
            </WalletProvider>
          </AuthProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

