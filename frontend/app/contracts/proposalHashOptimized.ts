export const PROPOSAL_HASH_OPTIMIZED_ABI = [
    {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "createProposal",
        "inputs": [
            { "name": "_contentHash", "type": "bytes32", "internalType": "bytes32" },
            { "name": "_optionCount", "type": "uint8", "internalType": "uint8" },
            { "name": "_durationDays", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "vote",
        "inputs": [
            { "name": "_proposalId", "type": "uint256", "internalType": "uint256" },
            { "name": "_optionId", "type": "uint8", "internalType": "uint8" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getProposal",
        "inputs": [{ "name": "_proposalId", "type": "uint256", "internalType": "uint256" }],
        "outputs": [
            { "name": "id", "type": "uint256", "internalType": "uint256" },
            { "name": "creator", "type": "address", "internalType": "address" },
            { "name": "contentHash", "type": "bytes32", "internalType": "bytes32" },
            { "name": "deadline", "type": "uint256", "internalType": "uint256" },
            { "name": "optionCount", "type": "uint8", "internalType": "uint8" },
            { "name": "totalVotes", "type": "uint256", "internalType": "uint256" },
            { "name": "executed", "type": "bool", "internalType": "bool" }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getAllVoteCounts",
        "inputs": [{ "name": "_proposalId", "type": "uint256", "internalType": "uint256" }],
        "outputs": [{ "name": "", "type": "uint256[]", "internalType": "uint256[]" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getWinningOption",
        "inputs": [{ "name": "_proposalId", "type": "uint256", "internalType": "uint256" }],
        "outputs": [
            { "name": "winningOption", "type": "uint8", "internalType": "uint8" },
            { "name": "winningVotes", "type": "uint256", "internalType": "uint256" }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "hasVoted",
        "inputs": [
            { "name": "_proposalId", "type": "uint256", "internalType": "uint256" },
            { "name": "_voter", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "verifyContentHash",
        "inputs": [
            { "name": "_proposalId", "type": "uint256", "internalType": "uint256" },
            { "name": "_expectedHash", "type": "bytes32", "internalType": "bytes32" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "generateContentHash",
        "inputs": [
            { "name": "_title", "type": "string", "internalType": "string" },
            { "name": "_description", "type": "string", "internalType": "string" },
            { "name": "_options", "type": "string[]", "internalType": "string[]" }
        ],
        "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
        "stateMutability": "pure"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "proposalCount",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "ProposalCreated",
        "inputs": [
            { "name": "proposalId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "creator", "type": "address", "indexed": true, "internalType": "address" },
            { "name": "contentHash", "type": "bytes32", "indexed": false, "internalType": "bytes32" },
            { "name": "deadline", "type": "uint256", "indexed": false, "internalType": "uint256" },
            { "name": "optionCount", "type": "uint8", "indexed": false, "internalType": "uint8" }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "VoteCast",
        "inputs": [
            { "name": "proposalId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "voter", "type": "address", "indexed": true, "internalType": "address" },
            { "name": "optionId", "type": "uint8", "indexed": false, "internalType": "uint8" }
        ],
        "anonymous": false
    }
] as const;

// Environment-based configuration
const isProduction = process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === 'mainnet';

// Hash-optimized contract addresses
const HASH_OPTIMIZED_TESTNET = process.env.NEXT_PUBLIC_HASH_OPTIMIZED_CONTRACT_TESTNET || "";
const HASH_OPTIMIZED_MAINNET = process.env.NEXT_PUBLIC_HASH_OPTIMIZED_CONTRACT_MAINNET || "";

export const HASH_OPTIMIZED_CONTRACT_ADDRESS = (isProduction ? HASH_OPTIMIZED_MAINNET : HASH_OPTIMIZED_TESTNET) as `0x${string}`;

// Chain IDs
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_MAINNET_CHAIN_ID = 8453;

export const CHAIN_ID = isProduction ? BASE_MAINNET_CHAIN_ID : BASE_SEPOLIA_CHAIN_ID;

// Block explorer URLs
export const BLOCK_EXPLORER_URL = isProduction
    ? "https://basescan.org"
    : "https://sepolia.basescan.org";

// Helper to get transaction URL
export const getTransactionUrl = (txHash: string) => `${BLOCK_EXPLORER_URL}/tx/${txHash}`;

// Helper to get address URL
export const getAddressUrl = (address: string) => `${BLOCK_EXPLORER_URL}/address/${address}`;

// Network name for display
export const NETWORK_NAME = isProduction ? "Base Mainnet" : "Base Sepolia";

// Hash generation utility (matches Solidity implementation)
import { keccak256, encodeAbiParameters } from 'viem';

export function generateContentHash(
    title: string,
    description: string,
    options: string[]
): `0x${string}` {
    // Use encodeAbiParameters to match Solidity's abi.encode
    return keccak256(encodeAbiParameters(
        [
            { type: 'string' },
            { type: 'string' },
            { type: 'string[]' }
        ],
        [title, description, options]
    ));
}

// Log current configuration (only in development)
if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Hash-Optimized Blockchain Configuration:', {
        network: NETWORK_NAME,
        chainId: CHAIN_ID,
        contractAddress: HASH_OPTIMIZED_CONTRACT_ADDRESS,
        blockExplorer: BLOCK_EXPLORER_URL,
        creationFee: '0 ETH (gas only)'
    });
}
