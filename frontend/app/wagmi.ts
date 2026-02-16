
import { http, createConfig, createStorage } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

export const config = createConfig({
    chains: [base, baseSepolia],
    connectors: [
        coinbaseWallet({
            appName: 'Voxen',
            preference: 'smartWalletOnly',
        }),
    ],
    storage: createStorage({
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    }),
    ssr: true,
    transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
    },
});
