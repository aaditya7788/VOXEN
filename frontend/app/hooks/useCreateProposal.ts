import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import {
    PROPOSAL_HASH_OPTIMIZED_ABI,
    HASH_OPTIMIZED_CONTRACT_ADDRESS,
    CHAIN_ID,
    generateContentHash
} from '../contracts/proposalHashOptimized';
import { useState, useEffect } from 'react';

export const useCreateProposal = () => {
    const { chainId, isConnected } = useAccount();
    const { switchChainAsync } = useSwitchChain();

    const {
        data: hash,
        error: writeError,
        isPending: isWritePending,
        writeContractAsync
    } = useWriteContract();

    const {
        data: receipt,
        isLoading: isConfirming,
        isSuccess: isConfirmed,
        error: confirmError
    } = useWaitForTransactionReceipt({
        hash,
    });

    const [error, setError] = useState<string | null>(null);
    const [proposalId, setProposalId] = useState<number | null>(null);

    // Parse ProposalCreated event when transaction is confirmed
    useEffect(() => {
        if (isConfirmed && receipt) {
            console.log("✅ Transaction confirmed! Receipt:", receipt);

            try {
                // Find the ProposalCreated event in the logs
                const proposalCreatedLog = receipt.logs.find((log, index) => {
                    try {
                        const decoded = decodeEventLog({
                            abi: PROPOSAL_HASH_OPTIMIZED_ABI,
                            data: log.data,
                            topics: log.topics,
                        });
                        return decoded.eventName === 'ProposalCreated';
                    } catch (err) {
                        return false;
                    }
                });

                if (proposalCreatedLog) {
                    const decoded = decodeEventLog({
                        abi: PROPOSAL_HASH_OPTIMIZED_ABI,
                        data: proposalCreatedLog.data,
                        topics: proposalCreatedLog.topics,
                    });

                    // ProposalCreated event: event ProposalCreated(uint256 indexed proposalId, address indexed creator, bytes32 contentHash, uint256 deadline, uint8 optionCount);
                    const id = Number(decoded.args.proposalId);
                    console.log("🆔 Extracted proposalId:", id);
                    setProposalId(id);
                } else {
                    console.error("❌ ProposalCreated event NOT FOUND in receipt logs!");
                }
            } catch (err) {
                console.error("❌ Failed to parse ProposalCreated event:", err);
            }
        }
    }, [isConfirmed, receipt]);

    // Reset error when write status changes
    useEffect(() => {
        if (writeError) {
            setError(writeError.message);
        } else if (confirmError) {
            setError(confirmError.message);
        } else {
            setError(null);
        }
    }, [writeError, confirmError]);

    const createProposal = async (
        title: string,
        description: string,
        options: string[],
        durationDays: number
    ) => {
        setError(null);
        setProposalId(null);

        if (!isConnected) {
            throw new Error("Wallet not connected");
        }

        if (chainId !== CHAIN_ID) {
            try {
                await switchChainAsync({ chainId: CHAIN_ID });
            } catch (e) {
                throw new Error(`Failed to switch network. Please switch to the correct network.`);
            }
        }

        try {
            // Generate content hash
            const contentHash = generateContentHash(title, description, options);
            console.log("Generated Content Hash:", contentHash);

            console.log("Creating optimized proposal with args:", { contentHash, optionCount: options.length, durationDays });

            const tx = await writeContractAsync({
                address: HASH_OPTIMIZED_CONTRACT_ADDRESS,
                abi: PROPOSAL_HASH_OPTIMIZED_ABI,
                functionName: 'createProposal',
                args: [
                    contentHash,
                    options.length,
                    BigInt(durationDays)
                ],
                chainId: CHAIN_ID
            });
            return tx;
        } catch (err: any) {
            console.error("Create proposal failed details:", err);
            const details = err.details || err.shortMessage || err.message || "Transaction failed";
            const cause = err.cause?.message ? ` Cause: ${err.cause.message}` : '';
            const msg = `${details}${cause}`;
            setError(msg);
            throw new Error(msg);
        }
    };

    return {
        createProposal,
        isPending: isWritePending || isConfirming,
        isSuccess: isConfirmed,
        hash,
        proposalId,
        error
    };
};
