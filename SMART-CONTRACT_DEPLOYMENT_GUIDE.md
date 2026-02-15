# Voxen Governance Deployment Guide

This guide provides instructions for deploying the **ProposalHashOptimized** smart contract to Base Sepolia (Testnet) and Base Mainnet.

## Prerequisites

1.  **Foundry**: Ensure you have [Foundry](https://book.getfoundry.sh/getting-started/installation) installed.
2.  **Private Key**: Have your deployer wallet private key ready.
3.  **Environment Variables**: Configure the `smart-contracts/.env` file.

 or you can add directly in the terminal

```bash
cast wallet import --private-key 0xyour_private_key_here
```
---

## 1. Setup Environment

Navigate to the `smart-contracts` directory and ensure your `.env` file contains:

```env
PRIVATE_KEY=0xyour_private_key_here
BASESCAN_API_KEY=your_basescan_api_key
```

---

## 2. Deploy to Base Sepolia (Testnet)

Run the following command to deploy and verify the contract on the testnet:

```bash
# Clean builds
forge clean

# Deploy and Verify
forge script script/DeployProposalHashOptimized.s.sol:DeployProposalHashOptimized \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

---

## 3. Deploy to Base Mainnet (Production)

**Warning**: This requires real ETH for gas. Ensure your wallet has sufficient balance.

```bash
# Clean builds
forge clean

# Deploy and Verify
forge script script/DeployProposalHashOptimized.s.sol:DeployProposalHashOptimized \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

---

## 4. Post-Deployment Steps

### Update Frontend
After successful deployment, copy the contract address from the terminal and update **`frontend/.env.local`**:

**For Testnet:**
```env
NEXT_PUBLIC_HASH_OPTIMIZED_CONTRACT_TESTNET=0xYourNewTestnetAddress
NEXT_PUBLIC_BLOCKCHAIN_NETWORK=testnet
```

**For Mainnet:**
```env
NEXT_PUBLIC_HASH_OPTIMIZED_CONTRACT_MAINNET=0xYourNewMainnetAddress
NEXT_PUBLIC_BLOCKCHAIN_NETWORK=mainnet
```

### Update Backend (Optional)
Update **`Backend/.env`** to maintain consistency:
```env
HASH_OPTIMIZED_CONTRACT_ADDRESS=0xYourNewAddress
```

---

## Troubleshooting

- **Verification Failed**: If the automatic verification fails, you can verify manually using:
  `forge verify-contract <CONTRACT_ADDRESS> src/ProposalHashOptimized.sol:ProposalHashOptimized --chain base-sepolia --etherscan-api-key $BASESCAN_API_KEY --watch`
- **Gas Issues**: On Mainnet, if the transaction is stuck, you may need to increase the `--priority-gas-price`.
