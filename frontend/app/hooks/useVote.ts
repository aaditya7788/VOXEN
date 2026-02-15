import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from 'wagmi';
import { decodeEventLog } from 'viem';
import {
    PROPOSAL_HASH_OPTIMIZED_ABI,
    HASH_OPTIMIZED_CONTRACT_ADDRESS,
    CHAIN_ID
} from '../contracts/proposalHashOptimized';
import { useState, useEffect } from 'react';

export const useVote = () => {
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

    const vote = async (
        proposalId: number,
        optionIndex: number
    ) => {
        setError(null);

        if (!isConnected) {
            throw new Error("Wallet not connected");
        }

        if (chainId !== CHAIN_ID) {
            try {
                await switchChainAsync({ chainId: CHAIN_ID });
            } catch (e) {
                throw new Error("Failed to switch network. Please switch to the correct network.");
            }
        }

        try {
            console.log("Voting on proposal:", { proposalId, optionIndex });
            const tx = await writeContractAsync({
                address: HASH_OPTIMIZED_CONTRACT_ADDRESS,
                abi: PROPOSAL_HASH_OPTIMIZED_ABI,
                functionName: 'vote',
                args: [
                    BigInt(proposalId),
                    optionIndex
                ],
                chainId: CHAIN_ID
            });
            return tx;
        } catch (err: any) {
            console.error("Vote failed details:", err);
            const details = err.details || err.shortMessage || err.message || "Transaction failed";
            const cause = err.cause?.message ? ` Cause: ${err.cause.message}` : '';
            const msg = `${details}${cause}`;
            setError(msg);
            throw new Error(msg);
        }
    };

    return {
        vote,
        isPending: isWritePending || isConfirming,
        isSuccess: isConfirmed,
        hash,
        error
    };
};
