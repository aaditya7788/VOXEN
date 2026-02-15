"use client";
import { ReactNode } from "react";
import { base, baseSepolia } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { AuthProvider } from "./contexts/AuthContext";
import { WalletProvider } from "./contexts/WalletContext";
import NetworkWarning from "./components/NetworkWarning";
import "@coinbase/onchainkit/styles.css";
import { CHAIN_ID, BASE_MAINNET_CHAIN_ID } from "./contracts/proposalHashOptimized";

const chain = CHAIN_ID === BASE_MAINNET_CHAIN_ID ? base : baseSepolia;

export function RootProvider({ children }: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={chain}
      config={{
        appearance: {
          mode: "auto",
        },
        wallet: {
          display: "modal",
          preference: "all",
        },
      }}
      miniKit={{
        enabled: true,
        autoConnect: true,
        notificationProxyUrl: undefined,
      }}
    >
      <AuthProvider>
        <WalletProvider>
          <NetworkWarning />
          {children}
        </WalletProvider>
      </AuthProvider>
    </OnchainKitProvider>
  );
}

