<div align="center">
  <img src="frontend/public/icon.png" alt="Voxen Logo" width="120" height="auto" />
  <h1>Voxen</h1>
  <p><strong>Decentralized Governance for the Modern Web</strong></p>

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a>
  </p>
</div>

---

## 🚀 Overview

**Voxen** is a cutting-edge decentralized application (dApp) designed to empower communities with transparent and efficient governance tools. Built on the **Base** blockchain, Voxen enables users to create proposals, vote securely, and manage decentralized autonomous organizations (DAOs) with ease.

By leveraging **Supabase** for off-chain data and **Smart Contracts** for on-chain execution, Voxen creates a seamless hybrid architecture that balances speed, cost, and security.

## ✨ Key Features

- **Store & Vote**: Securely create proposals and cast votes on-chain.
- **Gas-Optimized**: Smart contracts designed to minimize transaction costs.
- **Real-Time Updates**: Instant feedback and status tracking via Supabase.
- **Modern UI**: A sleek, responsive interface built with Next.js and Tailwind CSS.
- **Wallet Integration**: Seamless connection with Coinbase Wallet and other providers via OnchainKit.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Web3 Integration**: [OnchainKit](https://onchainkit.xyz/)
- **State Management**: React Hooks & Context API

### Backend
- **Server**: Node.js & Express
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: JWT & Supabase Auth

### Blockchain
- **Network**: Base (Sepolia Testnet / Mainnet)
- **Smart Contracts**: Solidity (Foundry)
- **Tools**: Forge, Cast

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Foundry (for smart contract development)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/aaditya7788/voxen.git
    cd voxen
    ```

2.  **Install Dependencies**
    ```bash
    # Frontend
    cd frontend
    npm install

    # Backend
    cd ../Backend
    npm install
    ```

3.  **Environment Setup**
    - Copy `.env.example` to `.env.local` in `frontend/` and fill in your keys.
    - Copy `.env.example` to `.env` in `Backend/` and configure your database and API keys.

4.  **Run Locally**
    ```bash
    # Terminal 1: Frontend
    cd frontend
    npm run dev

    # Terminal 2: Backend
    cd Backend
    npm run dev
    ```

## ⛓️ Smart Contract Deployment

This project uses [Foundry](https://getfoundry.sh/) for smart contract development and deployment.

### 1. Setup
Navigate to the `smart-contracts` directory and configure your environment:
```bash
cd smart-contracts
cp .env.example .env
# Fill in your PRIVATE_KEY and BASESCAN_API_KEY in .env
```

### 2. Deploy to Base Sepolia (Testnet)
```bash
# Clean and deploy
forge clean
forge script script/DeployProposalHashOptimized.s.sol:DeployProposalHashOptimized \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### 3. Deploy to Base Mainnet (Production)
```bash
# Clean and deploy
forge clean
forge script script/DeployProposalHashOptimized.s.sol:DeployProposalHashOptimized \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### 4. Update Frontend
After deployment, copy the new contract address and update your `frontend/.env.local` file:
```env
NEXT_PUBLIC_HASH_OPTIMIZED_CONTRACT_TESTNET=0xYourNewAddress
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by the Voxen Team</sub>
</div>
