"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useAccount } from "wagmi";
import { ArrowBackOutline, CalendarOutline, TimeOutline, CheckmarkCircleOutline, CloseOutline, AddOutline, SearchOutline, StatsChartOutline, RefreshOutline, ChevronBackOutline, ChevronForwardOutline } from "react-ionicons";
import { proposalApi, Proposal, ProposalStatus, VotingType } from "@/app/services/proposalApi";
import NewProposal from "./NewProposal";
import Toast, { ToastMessage } from "../Toast";
import ProposalDiscussion from "./ProposalDiscussion";
import ProposalNotifications from "./ProposalNotifications";
import { useVote } from "@/app/hooks/useVote";
import {
  CHAIN_ID,
  NETWORK_NAME,
  getTransactionUrl,
  getAddressUrl
} from "@/app/contracts/proposalHashOptimized";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface ProposalsProps {
  spaceId?: string;
  spaceSlug?: string;
  spaceName?: string;
  userRole?: string | null;
}

const statusStyles: Record<string, string> = {
  active: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-900/30",
  draft: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  cancelled: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30",
};

const votingTypeLabel: Record<VotingType, string> = {
  single: "Single choice",
  multiple: "Multiple choice",
  weighted: "Weighted voting",
};

export default function Proposals({ spaceId, spaceSlug, spaceName, userRole }: ProposalsProps) {
  const { isConnected } = useAccount();
  const [resolvedSpaceId, setResolvedSpaceId] = useState<string | null>(spaceId || null);
  const [activeFilter, setActiveFilter] = useState<ProposalStatus | "all">("active");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [searchQuery, setSearchQuery] = useState("");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [proposalVoters, setProposalVoters] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isVotersLoading, setIsVotersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [currentUserVote, setCurrentUserVote] = useState<any>(null);
  const [isChangingVote, setIsChangingVote] = useState(false);
  const [selectedSingle, setSelectedSingle] = useState<number | null>(null);
  const [selectedMultiple, setSelectedMultiple] = useState<number[]>([]);
  const [weightedVotes, setWeightedVotes] = useState<number[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [miningToastId, setMiningToastId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'proposal' | 'analytics'>('list');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [userVerification, setUserVerification] = useState<{ twitterLinked: boolean; emailVerified: boolean } | null>(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  // Blockchain voting hook
  const {
    vote: castVoteOnChain,
    isPending: isBlockchainVotePending,
    isSuccess: isBlockchainVoteSuccess,
    hash: blockchainVoteHash,
    error: blockchainVoteError
  } = useVote();

  // Track processed transaction hashes to prevent duplicate backend saves
  const processedTxs = useRef<Set<string>>(new Set());

  // Watch for blockchain vote success and save to backend
  useEffect(() => {
    const saveVoteToBackend = async () => {
      if (isBlockchainVoteSuccess && blockchainVoteHash && selectedProposal && resolvedSpaceId) {
        // Prevent duplicate saves for the same transaction
        if (processedTxs.current.has(blockchainVoteHash)) return;
        processedTxs.current.add(blockchainVoteHash);

        if (miningToastId) removeToast(miningToastId);
        setMiningToastId(null);
        

        // Prepare vote payload based on selection
        let votes: any = null;
        if (selectedProposal.voting_type === "single") {
          if (selectedSingle !== null) votes = { option: selectedSingle };
        } else if (selectedProposal.voting_type === "multiple") {
          // MVP: Single choice only for now
          if (selectedSingle !== null) votes = { option: selectedSingle };
        }

        // MVP: Support single choice only for blockchain for now?
        // Or check if 'selectedSingle' is populated.

        if (!votes && selectedSingle !== null) {
          votes = { option: selectedSingle };
        }

        if (votes) {
          try {
            // Generate vote hash for extra verification
            const { generateContentHash } = await import("@/app/contracts/proposalHashOptimized");
            const voteHash = generateContentHash(
              currentUserId || "0x",
              selectedProposal.id.toString(),
              [votes.option.toString()]
            );

            const response = await proposalApi.castVote(resolvedSpaceId, selectedProposal.id, {
              votes,
              blockchain_tx_hash: blockchainVoteHash,
              vote_hash: voteHash
            });

            const updated = response.data?.proposal;
            if (updated) {
              const merged = { ...selectedProposal, ...updated };
              setSelectedProposal(merged);
              setProposals((prev) => prev.map((p) => (p.id === merged.id ? { ...p, ...merged } : p)));
            }
            setHasVoted(true);
            addToast("✅ Vote verified on blockchain and saved!", "success", 4000);
          } catch (err: any) {
            console.error("Failed to save blockchain vote to backend:", err);
            addToast(`⚠️ Vote on-chain but backend save failed: ${err.message}`, "error", 6000);
          } finally {
            setIsVoting(false);
          }
        }
      }
    };

    if (isBlockchainVoteSuccess) {
      saveVoteToBackend();
    }
  }, [isBlockchainVoteSuccess, blockchainVoteHash, selectedProposal, resolvedSpaceId, selectedSingle, miningToastId]);

  // Handle blockchain errors
  useEffect(() => {
    if (blockchainVoteError) {
      if (miningToastId) removeToast(miningToastId);
      setMiningToastId(null);

      const errorMessage = (blockchainVoteError as any).shortMessage || blockchainVoteError.message || "Vote failed on chain";
      setVoteError(errorMessage);
      addToast(errorMessage, "error", 5000);
      setIsVoting(false);
    }
  }, [blockchainVoteError, miningToastId]);

  const token = typeof window !== "undefined" ? localStorage.getItem("voxen_token") : null;
  const isOwner = userRole === "owner";
  const canCreate = isOwner;
  const canClose = isOwner;
  const canViewAnalytics = isOwner && selectedProposal;

  // Toast helper function
  const addToast = (message: string, type: "success" | "error" | "info" | "loading" = "info", duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch user verification status
  const fetchUserVerification = async () => {
    if (!token) return;
    try {
      setIsCheckingVerification(true);
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setUserVerification({ twitterLinked: false, emailVerified: false });
        return;
      }
      const data = await response.json();
      const user = data.data || data;

      // Debug: Log the response
      

      // Check for Twitter - if twitter_handle or twitter_linked_at exists, Twitter is linked
      const twitterLinked = !!(user.twitter_handle || user.twitter_linked_at);

      // Check for Email - if email_verified_at exists, email is verified
      const emailVerified = !!user.email_verified_at;

      

      setCurrentUserId(user.id?.toString() || null);
      setCurrentUsername(user.username || null);
      setUserVerification({
        twitterLinked,
        emailVerified,
      });
    } catch (err) {
      console.error("Error fetching user verification:", err);
      setUserVerification({ twitterLinked: false, emailVerified: false });
    } finally {
      setIsCheckingVerification(false);
    }
  };

  // Fetch voters for a proposal
  const fetchProposalVoters = async (proposalId: string) => {
    if (!resolvedSpaceId) return;
    try {
      setIsVotersLoading(true);
      const response = await fetch(`${API_BASE_URL}/spaces/${resolvedSpaceId}/proposals/${proposalId}/votes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        setProposalVoters([]);
        return;
      }
      const data = await response.json();
      setProposalVoters(data.data?.votes || []);
    } catch (err) {
      console.error("Error fetching voters:", err);
      setProposalVoters([]);
    } finally {
      setIsVotersLoading(false);
    }
  };

  // Filter proposals based on search query
  const filteredProposals = useMemo(() => {
    if (!searchQuery.trim()) return proposals;
    const query = searchQuery.toLowerCase();
    return proposals.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
    );
  }, [proposals, searchQuery]);

  useEffect(() => {
    if (spaceId) {
      setResolvedSpaceId(spaceId);
      return;
    }

    if (!spaceSlug) {
      setResolvedSpaceId(null);
      return;
    }

    const resolveSpaceId = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/spaces/${spaceSlug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          setResolvedSpaceId(null);
          return;
        }
        const data = await res.json();
        setResolvedSpaceId(data.data?.id || null);
      } catch (err) {
        setResolvedSpaceId(null);
      }
    };

    resolveSpaceId();
  }, [spaceId, spaceSlug, token]);

  // Fetch user verification status when token changes
  useEffect(() => {
    if (token && isConnected) {
      fetchUserVerification();
    }
  }, [token, isConnected]);

  const handleFetchProposals = async (showLoading = true) => {
    if (!resolvedSpaceId) {
      setProposals([]);
      return;
    }

    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const response = await proposalApi.getSpaceProposals(resolvedSpaceId, {
        status: activeFilter === "all" ? undefined : activeFilter,
        sortBy: "created_at",
        sortOrder,
        limit: 20,
      });
      const items = response.data || [];
      setProposals(items);
      addToast("Proposals refreshed", "success", 2000);
    } catch (err: any) {
      setError(err.message || "Failed to load proposals");
      addToast(err.message || "Failed to load proposals", "error", 3000);
    } finally {
      if (showLoading) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefreshProposals = async () => {
    setIsRefreshing(true);
    await handleFetchProposals(false);
  };

  useEffect(() => {
    if (!resolvedSpaceId) {
      setProposals([]);
      return;
    }

    handleFetchProposals();

    // Check if there's a proposal to open from activity click
    const openProposalId = typeof window !== "undefined" ? sessionStorage.getItem("openProposalId") : null;
    if (openProposalId) {
      sessionStorage.removeItem("openProposalId");
      // The proposal will be opened once it's in the list
    }
  }, [resolvedSpaceId, activeFilter, sortOrder]);

  // Check if there's a proposal to open from activity/notification click
  useEffect(() => {
    if (proposals.length === 0 || !resolvedSpaceId) return;

    const openProposalId = typeof window !== "undefined" ? sessionStorage.getItem("openProposalId") : null;
    if (openProposalId) {
      sessionStorage.removeItem("openProposalId");
      const proposalToOpen = proposals.find(p => p.id === openProposalId);
      if (proposalToOpen) {
        handleOpenProposal(proposalToOpen);
      }
    }
  }, [proposals, resolvedSpaceId]);

  // Handle notification click - receives proposal ID string
  const handleNotificationClick = (proposalId: string) => {
    const proposalToOpen = proposals.find(p => p.id === proposalId);
    if (proposalToOpen) {
      handleOpenProposal(proposalToOpen);
    }
  };

  useEffect(() => {
    if (!selectedProposal) return;
    const options = normalizeOptions(selectedProposal.options);
    setSelectedSingle(null);
    setSelectedMultiple([]);
    setWeightedVotes(options.map(() => 0));
    setVoteError(null);
    setIsChangingVote(false);
  }, [selectedProposal?.id]);

  const handleOpenProposal = async (proposal: Proposal) => {
    if (!resolvedSpaceId) return;
    setIsDetailLoading(true);
    setVoteError(null);
    setHasVoted(false);
    setIsChangingVote(false);
    try {
      const response = await proposalApi.getProposal(resolvedSpaceId, proposal.id);
      const proposalData = response.data || proposal;

      // Set proposal with the fresh data
      setSelectedProposal(proposalData);

      // Check if user has voted using dedicated API endpoint
      if (token) {
        try {
          const voteCheckResponse = await proposalApi.checkUserVote(resolvedSpaceId, proposal.id);
          const voted = voteCheckResponse.data?.voted || false;
          const userVote = voteCheckResponse.data?.vote || null;
          
          setHasVoted(voted);
          setCurrentUserVote(userVote);
        } catch (err) {
          console.error("Error checking vote status:", err);
          setHasVoted(false);
          setCurrentUserVote(null);
        }
      } else {
        setHasVoted(false);
        setCurrentUserVote(null);
      }

      // Fetch voters for this proposal
      await fetchProposalVoters(proposal.id);
    } catch (err: any) {
      console.error("Error fetching proposal details:", err);
      setSelectedProposal(proposal);
      setHasVoted(false);
      await fetchProposalVoters(proposal.id);
      addToast("Could not load full proposal details, showing cached data", "info", 3000);
    } finally {
      setIsDetailLoading(false);
    }
  }

  const handleProposalCreated = async () => {
    addToast("Proposal created successfully!", "success", 3000);
    setIsCreating(false);
    // Refresh proposals list
    if (resolvedSpaceId) {
      setIsLoading(true);
      try {
        const response = await proposalApi.getSpaceProposals(resolvedSpaceId, {
          status: activeFilter === "all" ? undefined : activeFilter,
          sortBy: "created_at",
          sortOrder,
          limit: 20,
        });
        const items = response.data || [];
        setProposals(items);
      } catch (err: any) {
        setError(err.message || "Failed to load proposals");
        addToast(err.message || "Failed to load proposals", "error", 4000);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVoteSubmit = async () => {
    if (!selectedProposal || !resolvedSpaceId) return;

    setVoteError(null);
    if (!token) {
      const msg = "Connect wallet and sign in to vote.";
      setVoteError(msg);
      addToast(msg, "error", 4000);
      return;
    }

    // Check verification requirements
    if (!userVerification) {
      const msg = "Please wait while we verify your account...";
      setVoteError(msg);
      addToast(msg, "info", 3000);
      return;
    }

    if (!userVerification.twitterLinked) {
      const msg = "You must link your Twitter account to vote. Go to Profile Settings to connect.";
      setVoteError(msg);
      addToast(msg, "error", 5000);
      return;
    }

    if (!userVerification.emailVerified) {
      const msg = "You must verify your email to vote. Check your email for a verification link.";
      setVoteError(msg);
      addToast(msg, "error", 5000);
      return;
    }

    // Check if Blockchain Voting
    if (selectedProposal.use_blockchain) {
      if (!selectedProposal.blockchain_proposal_id && selectedProposal.blockchain_proposal_id !== 0) {
        setVoteError("Blockchain proposal ID missing. Cannot vote on-chain.");
        return;
      }

      if (selectedProposal.voting_type !== "single") {
        setVoteError("Only single choice voting is currently supported on-chain.");
        return;
      }

      if (selectedSingle === null) {
        const msg = "Select one option to vote.";
        setVoteError(msg);
        addToast(msg, "error", 3000);
        return;
      }

      let checkWalletToastId: string | undefined;
      try {
        setIsVoting(true);
        checkWalletToastId = addToast("📝 Check your wallet to confirm vote...", "loading", 0);

        await castVoteOnChain(selectedProposal.blockchain_proposal_id, selectedSingle);

        if (checkWalletToastId) removeToast(checkWalletToastId);
        const miningId = addToast("⏳ Transaction submitted! Waiting for blockchain confirmation...", "info", 0);
        setMiningToastId(miningId);
      } catch (err: any) {
        if (checkWalletToastId) removeToast(checkWalletToastId);
        console.error("Blockchain vote failed:", err);
        // Error toast will be handled by the useEffect watching blockchainVoteError
        if (!blockchainVoteError) {
          const errMsg = err.message || "Failed to submit transaction";
          addToast(errMsg, "error", 4000);
        }
        setIsVoting(false);
      }
      return;
    }

    // Standard Voting Payload Preparation
    const options = normalizeOptions(selectedProposal.options);
    let votes: any = null;

    if (selectedProposal.voting_type === "single") {
      if (selectedSingle === null) {
        const msg = "Select one option to vote.";
        setVoteError(msg);
        addToast(msg, "error", 3000);
        return;
      }
      votes = { option: selectedSingle };
    }

    if (selectedProposal.voting_type === "multiple") {
      if (selectedMultiple.length === 0) {
        const msg = "Select at least one option.";
        setVoteError(msg);
        addToast(msg, "error", 3000);
        return;
      }
      votes = selectedMultiple;
    }

    if (selectedProposal.voting_type === "weighted") {
      const totalWeight = weightedVotes.reduce((sum, value) => sum + value, 0);
      if (totalWeight <= 0) {
        const msg = "Add weight to at least one option.";
        setVoteError(msg);
        addToast(msg, "error", 3000);
        return;
      }
      votes = {};
      weightedVotes.forEach((weight, index) => {
        if (weight > 0) {
          votes[index] = weight;
        }
      });
    }

    if (!votes) {
      const msg = "Unable to submit vote.";
      setVoteError(msg);
      addToast(msg, "error", 3000);
      return;
    }

    const loadingToastId = addToast("Submitting your vote...", "loading", 0);
    setIsVoting(true);
    try {
      const response = await proposalApi.castVote(resolvedSpaceId, selectedProposal.id, { votes });
      const updated = response.data?.proposal;
      if (updated) {
        const merged = { ...selectedProposal, ...updated };
        setSelectedProposal(merged);
        setProposals((prev) => prev.map((p) => (p.id === merged.id ? { ...p, ...merged } : p)));
      }
      setHasVoted(true);
      removeToast(loadingToastId);
      addToast("Vote submitted successfully!", "success", 3000);
    } catch (err: any) {
      removeToast(loadingToastId);
      const errMsg = err.message || "Failed to submit vote.";
      setVoteError(errMsg);
      addToast(errMsg, "error", 4000);
    } finally {
      setIsVoting(false);
    }
  };

  const handleCloseProposal = async () => {
    if (!selectedProposal || !resolvedSpaceId) return;
    if (!canClose) return;
    if (!window.confirm("Close this proposal? This will finalize results.")) return;

    const loadingToastId = addToast("Closing proposal...", "loading", 0);
    setIsVoting(true);
    try {
      const response = await proposalApi.closeProposal(resolvedSpaceId, selectedProposal.id);
      const updated = response.data;
      if (updated) {
        const merged = { ...selectedProposal, ...updated };
        setSelectedProposal(merged);
        setProposals((prev) => prev.map((p) => (p.id === merged.id ? { ...p, ...merged } : p)));
      }
      removeToast(loadingToastId);
      addToast("Proposal closed successfully!", "success", 3000);
    } catch (err: any) {
      removeToast(loadingToastId);
      const errMsg = err.message || "Failed to close proposal.";
      setVoteError(errMsg);
      addToast(errMsg, "error", 4000);
    } finally {
      setIsVoting(false);
    }
  };

  const resetVotingForm = () => {
    if (!selectedProposal) return;
    const options = normalizeOptions(selectedProposal.options);
    setSelectedSingle(null);
    setSelectedMultiple([]);
    setWeightedVotes(options.map(() => 0));
    setVoteError(null);
  };

  const handleChangeVoteClick = () => {
    setIsChangingVote(true);
    resetVotingForm();
  };

  const handleCancelChangeVote = () => {
    setIsChangingVote(false);
    resetVotingForm();
  };

  const handleVoteSubmitWithChangeMode = async () => {
    const wasChangingVote = isChangingVote;
    await handleVoteSubmit();
    if (wasChangingVote) {
      setIsChangingVote(false);
    }
  };

  const handleViewAnalytics = async () => {
    if (!selectedProposal || !resolvedSpaceId || !canViewAnalytics) return;

    setIsLoadingAnalytics(true);
    try {
      
      const response = await proposalApi.getProposalAnalytics(resolvedSpaceId, selectedProposal.id);
      

      if (response.data) {
        
        setAnalyticsData(response.data);
        setAnalyticsPage(1);
        setViewMode('analytics');
        addToast("Analytics loaded", "success", 2000);
      } else {
        addToast("No analytics data received", "error", 3000);
      }
    } catch (err: any) {
      console.error("Error loading analytics:", err);
      addToast(err.message || "Failed to load analytics", "error", 3000);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const filteredOptions = useMemo(() => {
    if (!selectedProposal) return [];
    return normalizeOptions(selectedProposal.options);
  }, [selectedProposal]);

  const resultsSummary = useMemo(() => {
    if (!selectedProposal) return { total: 0, values: [] as number[] };
    const results = normalizeResults(selectedProposal.results);
    const values = filteredOptions.map((_, index) => Number(results[index.toString()] || 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    return { total, values };
  }, [selectedProposal, filteredOptions]);

  if (!resolvedSpaceId) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24">
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border p-6 text-center">
          <h3 className="text-base md:text-lg font-bold text-base-text dark:text-dark-text">Select a space</h3>
          <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary mt-2">
            Choose a space to view proposals.
          </p>
        </div>
      </div>
    );
  }

  if (isCreating && resolvedSpaceId) {
    return (
      <NewProposal
        onBack={() => setIsCreating(false)}
        onSubmit={handleProposalCreated}
        spaceName={spaceName}
        spaceId={resolvedSpaceId}
      />
    );
  }

  if (selectedProposal) {
    // Analytics View Mode
    if (viewMode === 'analytics' && analyticsData) {
      const { proposal, analytics } = analyticsData;
      const votersPerPage = 10;
      const maxVoters = 30;
      const voters = (analytics && analytics.voter_list) ? analytics.voter_list : [];
      const limitedVoters = voters.slice(0, maxVoters);
      const totalPages = limitedVoters.length > 0 ? Math.ceil(limitedVoters.length / votersPerPage) : 1;
      const paginatedVoters = limitedVoters.slice(
        (analyticsPage - 1) * votersPerPage,
        analyticsPage * votersPerPage
      );

      return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24 pb-12">
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
            {/* Back Button */}
            <button
              onClick={() => {
                setViewMode('proposal');
                setAnalyticsData(null);
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-base-text-secondary hover:text-base-text dark:text-dark-text-secondary dark:hover:text-dark-text transition-colors"
            >
              <ArrowBackOutline width="18px" height="18px" color="currentColor" />
              Back to proposal
            </button>

            {/* Analytics Header */}
            <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border p-6 shadow-soft">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-base-text dark:text-dark-text">{proposal?.title}</h1>
                  {proposal?.description && (
                    <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary mt-2">{proposal.description}</p>
                  )}
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
                  {proposal?.status}
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium">
                  Total Votes: {analytics?.total_votes}
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-medium">
                  {proposal?.voting_type}
                </span>
              </div>

              {/* Voting Results */}
              <div>
                <h2 className="text-lg font-bold text-base-text dark:text-dark-text mb-4">Voting Results</h2>
                <div className="space-y-4">
                  {analytics?.voting_results?.map((result: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-base-text dark:text-dark-text">{result.option}</span>
                        <span className="text-sm font-bold text-primary">{result.percentage}% ({result.votes})</span>
                      </div>
                      <div className="w-full bg-base-bg-secondary dark:bg-dark-border rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/70"
                          style={{ width: `${result.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Option */}
              {analytics?.top_option && (
                <div className="mt-6 p-4 bg-primary/10 dark:bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs font-semibold text-primary uppercase mb-1">Leading Option</p>
                  <p className="text-lg font-bold text-base-text dark:text-dark-text">{analytics.top_option.option}</p>
                  <p className="text-sm text-base-text-secondary mt-1">{analytics.top_option.percentage}% ({analytics.top_option.votes} votes)</p>
                </div>
              )}
            </div>

            {/* Voters List */}
            <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-base-text dark:text-dark-text">
                  Voters ({limitedVoters.length}{limitedVoters.length < voters.length ? " of " + voters.length : ""})
                </h2>
                {totalPages > 1 && (
                  <span className="text-xs text-base-text-secondary">Page {analyticsPage} of {totalPages}</span>
                )}
              </div>

              <div className="space-y-3">
                {paginatedVoters.length > 0 ? (
                  paginatedVoters.map((voter: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border border-base-border dark:border-dark-border hover:bg-base-bg-secondary dark:hover:bg-dark-border/50 transition-colors"
                    >
                      {voter.profile_pic && (
                        <img
                          src={voter.profile_pic}
                          alt={voter.username}
                          className="w-10 h-10 rounded-full flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-base-text dark:text-dark-text truncate">{voter.username}</p>
                        <p className="text-xs text-base-text-secondary">
                          {new Date(voter.voted_at).toLocaleDateString()} • {new Date(voter.voted_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <p className="text-xs font-medium text-primary">{voter.vote_power} vote{voter.vote_power !== 1 ? "s" : ""}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-base-text-secondary">No voters yet</p>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-base-border">
                  <button
                    onClick={() => setAnalyticsPage(Math.max(1, analyticsPage - 1))}
                    disabled={analyticsPage === 1}
                    className="p-2 rounded-lg border border-base-border hover:bg-base-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronBackOutline width="18px" height="18px" color="currentColor" />
                  </button>
                  <span className="text-sm text-base-text-secondary">{analyticsPage} / {totalPages}</span>
                  <button
                    onClick={() => setAnalyticsPage(Math.min(totalPages, analyticsPage + 1))}
                    disabled={analyticsPage === totalPages}
                    className="p-2 rounded-lg border border-base-border hover:bg-base-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronForwardOutline width="18px" height="18px" color="currentColor" />
                  </button>
                </div>
              )}

              {voters.length > maxVoters && (
                <p className="text-xs text-base-text-secondary text-center mt-3">Showing {maxVoters} most recent voters</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Proposal Voting View
    const options = filteredOptions;
    const now = new Date();
    const startDate = new Date(selectedProposal.start_date);
    const endDate = new Date(selectedProposal.end_date);
    const isActive = selectedProposal.status === "active" && endDate > now;
    const isPending = selectedProposal.status === "active" && startDate > now;
    const canVote = isActive && !isPending && !hasVoted;
    const showResults = selectedProposal.status === "closed" || hasVoted;

    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24 pb-12">
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
          <button
            onClick={() => {
              setSelectedProposal(null);
              setViewMode('list');
              setAnalyticsData(null);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-base-text-secondary hover:text-base-text dark:text-dark-text-secondary dark:hover:text-dark-text transition-colors"
          >
            <ArrowBackOutline width="18px" height="18px" color="currentColor" />
            Back to proposals
          </button>

          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border p-4 md:p-6 shadow-soft">
            {isDetailLoading && (
              <div className="text-sm text-base-text-secondary dark:text-dark-text-secondary mb-4">
                Refreshing proposal details...
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-base-text dark:text-dark-text">
                  {selectedProposal.title}
                </h1>
                <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary mt-1">
                  {selectedProposal.creator_username || "Unknown"} - {formatTimeAgo(selectedProposal.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide border ${statusStyles[selectedProposal.status] || statusStyles.active}`}>
                  {selectedProposal.status}
                </span>
                {selectedProposal.use_blockchain && (
                  (selectedProposal.blockchain_tx_hash || selectedProposal.transaction_hash) ? (
                    <a
                      href={getTransactionUrl((selectedProposal.blockchain_tx_hash || selectedProposal.transaction_hash)!)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide border bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1"
                      title={`View on ${NETWORK_NAME} Explorer`}
                    >
                      On-Chain ↗
                    </a>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide border bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30">
                      On-Chain
                    </span>
                  )
                )}
              </div>
            </div>

            {selectedProposal.description && (
              <p className="text-sm md:text-base text-base-text-secondary dark:text-dark-text-secondary leading-relaxed mb-4">
                {selectedProposal.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary mb-4">
              <span className="inline-flex items-center gap-1.5 bg-base-bg-secondary dark:bg-dark-border px-2.5 py-1 rounded-full">
                <CalendarOutline width="14px" height="14px" color="currentColor" />
                {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-base-bg-secondary dark:bg-dark-border px-2.5 py-1 rounded-full">
                <TimeOutline width="14px" height="14px" color="currentColor" />
                {votingTypeLabel[selectedProposal.voting_type]}
              </span>
            </div>

            {isPending && (
              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg p-3 text-xs md:text-sm text-orange-700 dark:text-orange-200 mb-4">
                Voting opens on {startDate.toLocaleString()}.
              </div>
            )}

            {!isPending && !isActive && (
              <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-4">
                Voting has ended.
              </div>
            )}

            <div className="space-y-3 md:space-y-4">
              {options.map((option, index) => (
                <div
                  key={`${selectedProposal.id}-option-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-base-border dark:border-dark-border p-3 md:p-4 bg-white dark:bg-dark-bg-secondary"
                >
                  <div className="flex items-start gap-3 flex-1">
                    {/* Only show voting inputs if user hasn't voted yet or is changing vote */}
                    {(!hasVoted || isChangingVote) && (
                      <>
                        {selectedProposal.voting_type === "single" && (
                          <input
                            type="radio"
                            name={`proposal-${selectedProposal.id}`}
                            checked={selectedSingle === index}
                            onChange={() => setSelectedSingle(index)}
                            disabled={!canVote}
                            className="mt-1"
                          />
                        )}
                        {selectedProposal.voting_type === "multiple" && (
                          <input
                            type="checkbox"
                            checked={selectedMultiple.includes(index)}
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSelectedMultiple((prev) => [...prev, index]);
                              } else {
                                setSelectedMultiple((prev) => prev.filter((value) => value !== index));
                              }
                            }}
                            disabled={!canVote}
                            className="mt-1"
                          />
                        )}
                        {selectedProposal.voting_type === "weighted" && (
                          <input
                            type="number"
                            min={0}
                            value={weightedVotes[index] || 0}
                            onChange={(event) => {
                              const value = Math.max(0, Number(event.target.value || 0));
                              setWeightedVotes((prev) => prev.map((item, idx) => (idx === index ? value : item)));
                            }}
                            disabled={!canVote}
                            className="w-20 px-2 py-1 rounded border border-base-border dark:border-dark-border bg-base-bg-secondary dark:bg-dark-border text-sm"
                          />
                        )}
                      </>
                    )}
                    <div>
                      <p className="text-sm md:text-base font-semibold text-base-text dark:text-dark-text">
                        {option}
                      </p>
                      {/* Show results when voted or when proposal is closed */}
                      {showResults && (
                        <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary mt-1">
                          {resultsSummary.total > 0
                            ? `${Math.round((resultsSummary.values[index] / resultsSummary.total) * 100)}% (${resultsSummary.values[index]})`
                            : "0% (0)"}
                        </p>
                      )}
                    </div>
                  </div>
                  {showResults && (
                    <div className="w-20 md:w-28">
                      <div className="h-2 bg-base-bg-secondary dark:bg-dark-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width:
                              resultsSummary.total > 0
                                ? `${Math.round((resultsSummary.values[index] / resultsSummary.total) * 100)}%`
                                : "0%",
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedProposal.voting_type === "weighted" && canVote && (
              <div className="text-xs text-base-text-secondary dark:text-dark-text-secondary mt-2">
                Total weight: {weightedVotes.reduce((sum, value) => sum + value, 0)}
              </div>
            )}

            {voteError && (
              <div className="mt-4 text-sm text-red-500">{voteError}</div>
            )}

            {/* Verification Requirements */}
            {isConnected && token && (
              <div className="mt-4 p-4 rounded-lg bg-base-bg-secondary dark:bg-dark-border/50 border border-base-border dark:border-dark-border/50">
                <p className="text-xs font-semibold text-base-text dark:text-dark-text uppercase mb-3">
                  ✓ Vote Requirements
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${userVerification?.twitterLinked ? 'bg-green-500' : 'bg-red-500'}`}>
                      {userVerification?.twitterLinked ? '✓' : '✕'}
                    </div>
                    <span className="text-sm font-medium">Twitter Account Linked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${userVerification?.emailVerified ? 'bg-green-500' : 'bg-red-500'}`}>
                      {userVerification?.emailVerified ? '✓' : '✕'}
                    </div>
                    <span className="text-sm font-medium">Email Verified</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-5">
              {canViewAnalytics && (
                <>
                  <button
                    onClick={handleViewAnalytics}
                    disabled={isLoadingAnalytics}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-semibold w-full sm:w-auto"
                  >
                    <StatsChartOutline width="18px" height="18px" color="currentColor" />
                    {isLoadingAnalytics ? "Loading..." : "Analytics"}
                  </button>

                </>
              )}
              {canClose && selectedProposal.status === "active" && (
                <button
                  onClick={handleCloseProposal}
                  disabled={isVoting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-semibold w-full sm:w-auto"
                >
                  <CloseOutline width="18px" height="18px" color="currentColor" />
                  Close proposal
                </button>
              )}
              {isChangingVote && (
                <button
                  onClick={handleCancelChangeVote}
                  disabled={isVoting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-base-border dark:border-dark-border text-base-text dark:text-dark-text hover:bg-base-bg-secondary dark:hover:bg-dark-border disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-semibold w-full sm:w-auto"
                >
                  Cancel
                </button>
              )}
              {hasVoted && !isChangingVote && (
                <button
                  onClick={handleChangeVoteClick}
                  disabled={isVoting || !canVote}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-semibold w-full sm:w-auto"
                >
                  Change vote
                </button>
              )}

              {hasVoted && !isChangingVote && selectedProposal.use_blockchain && (currentUserVote?.blockchain_tx_hash || currentUserVote?.transaction_hash) && (
                <a
                  href={getTransactionUrl((currentUserVote.blockchain_tx_hash || currentUserVote.transaction_hash)!)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30 dark:hover:bg-blue-900/40 transition-colors text-sm font-semibold w-full sm:w-auto"
                >
                  <CheckmarkCircleOutline width="18px" height="18px" color="currentColor" />
                  Voted On-Chain ↗
                </a>
              )}

              <button
                onClick={handleVoteSubmitWithChangeMode}
                disabled={!canVote || isVoting || !userVerification?.twitterLinked || !userVerification?.emailVerified}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-sm disabled:bg-base-bg-secondary disabled:text-base-text-secondary disabled:dark:bg-dark-border disabled:dark:text-dark-text-secondary disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
              >
                {isChangingVote ? (
                  "Update vote"
                ) : hasVoted ? (
                  <>
                    <CheckmarkCircleOutline width="18px" height="18px" color="currentColor" />
                    Vote submitted
                  </>
                ) : (
                  "Submit vote"
                )}
              </button>
              {!isConnected && (
                <div className="text-xs text-base-text-secondary dark:text-dark-text-secondary self-center">
                  Connect wallet to vote.
                </div>
              )}
              {isConnected && userVerification && (!userVerification.twitterLinked || !userVerification.emailVerified) && (
                <div className="text-xs text-red-500 self-center">
                  {!userVerification.twitterLinked && "Link Twitter to vote • "}
                  {!userVerification.emailVerified && "Verify email to vote"}
                </div>
              )}
              {hasVoted && !isChangingVote && (
                <div className="text-xs text-green-600 dark:text-green-400 self-center">
                  ✓ You've already voted. Results are displayed below.
                </div>
              )}
            </div>

            {/* Voters Section */}
            {proposalVoters.length > 0 && (
              <div className="mt-6 pt-6 border-t border-base-border dark:border-dark-border/50">
                <h3 className="text-sm font-semibold text-base-text dark:text-dark-text mb-4">
                  Voters ({proposalVoters.length})
                </h3>
                <div className="space-y-3">
                  {proposalVoters.map((voter) => (
                    <div key={voter.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-base-bg-secondary dark:bg-dark-border/30">
                      {voter.profile_pic ? (
                        <div className="size-8 rounded-full bg-cover bg-center border border-base-border dark:border-dark-border shrink-0" style={{ backgroundImage: `url('${voter.profile_pic}')` }} />
                      ) : (
                        <div className="size-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs shrink-0">
                          {(voter.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-base-text dark:text-dark-text truncate">
                          {voter.username || "Unknown User"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discussion Section */}
            <div className="mt-6 pt-6 border-t border-base-border dark:border-dark-border/50">
              <ProposalDiscussion
                proposalId={selectedProposal.id.toString()}
                spaceId={resolvedSpaceId || undefined}
                currentUserId={currentUserId || undefined}
                currentUsername={currentUsername || undefined}
                token={token}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} onClose={removeToast} />
      <ProposalNotifications
        spaceId={resolvedSpaceId || undefined}
        onProposalClick={handleNotificationClick}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24">

        <div className="flex flex-col gap-4 mb-6 md:mb-8">
          {/* Controls Row - Filters Left, Sort & Create Right */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Filter Buttons */}
            <div className="flex p-1 bg-white dark:bg-dark-bg-secondary border border-base-border dark:border-dark-border rounded-lg w-full sm:w-auto">
              {(["active", "draft", "closed", "cancelled"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 text-sm font-medium capitalize transition-colors ${activeFilter === filter
                    ? "font-semibold text-base-text dark:text-dark-text bg-base-bg-secondary dark:bg-dark-border rounded shadow-sm"
                    : "text-base-text-secondary dark:text-dark-text-secondary hover:text-base-text dark:hover:text-dark-text"
                    }`}
                >
                  {filter}
                </button>
              ))}
              <button
                onClick={() => setActiveFilter("all")}
                className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 text-sm font-medium capitalize transition-colors ${activeFilter === "all"
                  ? "font-semibold text-base-text dark:text-dark-text bg-base-bg-secondary dark:bg-dark-border rounded shadow-sm"
                  : "text-base-text-secondary dark:text-dark-text-secondary hover:text-base-text dark:hover:text-dark-text"
                  }`}
              >
                all
              </button>
            </div>

            {/* Right Controls - Sort & Create Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setSortOrder((prev) => (prev === "DESC" ? "ASC" : "DESC"))}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-base-text dark:text-dark-text hover:bg-base-bg-secondary dark:hover:bg-dark-border/30 rounded-lg transition-colors whitespace-nowrap"
              >
                <span className="hidden sm:inline">Sort:</span> {sortOrder === "DESC" ? "Recent" : "Oldest"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <button
                onClick={handleRefreshProposals}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2 text-base-text dark:text-dark-text hover:bg-base-bg-secondary dark:hover:bg-dark-border/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh proposals"
              >
                <RefreshOutline width="18px" height="18px" color="currentColor" className={isRefreshing ? "animate-spin" : ""} />
              </button>

              {canViewAnalytics && (
                <button
                  onClick={() => setShowAnalytics(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-base-bg-secondary dark:bg-dark-border text-base-text dark:text-dark-text hover:bg-base-border dark:hover:bg-dark-border/70 font-semibold rounded-lg transition-all active:scale-[0.98] text-sm whitespace-nowrap"
                >
                  <StatsChartOutline width="18px" height="18px" color="currentColor" />
                  <span className="hidden sm:inline">Analytics</span>
                </button>
              )}

              {canCreate && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-primary/20 text-sm whitespace-nowrap"
                >
                  <AddOutline width="18px" height="18px" color="currentColor" />
                  <span className="hidden sm:inline">Create</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:gap-6 pb-12">
          {isLoading && (
            <div className="text-sm text-base-text-secondary dark:text-dark-text-secondary">Loading proposals...</div>
          )}
          {error && (
            <div className="text-sm text-red-500">{error}</div>
          )}
          {!isLoading && !error && proposals.length === 0 && (
            <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border p-6 text-center">
              <h3 className="text-base md:text-lg font-bold text-base-text dark:text-dark-text">No proposals yet</h3>
              {canCreate ? (
                <>
                  <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary mt-2 mb-4">
                    Be the first to create a proposal in {spaceName || "this space"}.
                  </p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-colors text-sm"
                  >
                    <AddOutline width="18px" height="18px" color="currentColor" />
                    Create Proposal
                  </button>
                </>
              ) : (
                <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary mt-2">
                  Only space owners can create proposals.
                </p>
              )}
            </div>
          )}
          {!isLoading &&
            filteredProposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} onOpen={() => handleOpenProposal(proposal)} />
            ))}
        </div>
      </div>
    </>
  );
}

function ProposalCard({ proposal, onOpen }: { proposal: Proposal; onOpen: () => void }) {
  const options = normalizeOptions(proposal.options);
  const results = normalizeResults(proposal.results);
  const totalVotesFromResults = Object.values(results).reduce((sum, value) => sum + Number(value || 0), 0);
  const totalVotes = totalVotesFromResults > 0 ? totalVotesFromResults : proposal.vote_count || 0;
  const endsIn = getEndsIn(proposal.end_date);
  const status = proposal.status === "active" && new Date(proposal.end_date) <= new Date() ? "closed" : proposal.status;

  return (
    <article className="bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border shadow-soft p-4 md:p-6 transition-all hover:border-primary/30 dark:hover:border-primary/30">
      <div className="flex items-start justify-between mb-4 md:mb-5">
        <div className="flex items-center gap-2.5 md:gap-3">
          {proposal.creator_pic ? (
            <div className="size-9 md:size-11 rounded-full bg-cover bg-center border border-base-border dark:border-dark-border shrink-0" style={{ backgroundImage: `url('${proposal.creator_pic}')` }} />
          ) : (
            <div className="size-9 md:size-11 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs md:text-sm shadow-md shrink-0">
              {(proposal.creator_username || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm md:text-base font-bold text-base-text dark:text-dark-text leading-tight truncate">
              {proposal.creator_username || "Unknown"}
            </h3>
            <div className="text-[10px] md:text-xs text-base-text-secondary mt-0.5">
              {formatTimeAgo(proposal.created_at)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide border ${statusStyles[status] || statusStyles.active}`}>
            {status}
          </span>
          {proposal.use_blockchain && (
            (proposal.blockchain_tx_hash || proposal.transaction_hash) ? (
              <a
                href={getTransactionUrl((proposal.blockchain_tx_hash || proposal.transaction_hash)!)}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()} // Prevent opening the proposal card when clicking the explorer link
                className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide border bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                title={`View on ${NETWORK_NAME} Explorer`}
              >
                On-Chain ↗
              </a>
            ) : (
              <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide border bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30">
                On-Chain
              </span>
            )
          )}
        </div>
      </div>

      <div className="mb-4 md:mb-6">
        <h2 className="text-base md:text-xl font-bold text-base-text dark:text-dark-text mb-2 md:mb-3">{proposal.title}</h2>
        {proposal.description && (
          <p className="text-base-text-secondary dark:text-dark-text-secondary text-xs md:text-sm leading-relaxed line-clamp-3 md:line-clamp-none">
            {proposal.description}
          </p>
        )}
      </div>

      {options.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {options.slice(0, 4).map((option, index) => (
            <span key={`${proposal.id}-tag-${index}`} className="px-3 py-1 bg-base-bg-secondary dark:bg-dark-border rounded-full text-xs font-medium text-base-text dark:text-dark-text">
              {option}
            </span>
          ))}
          {options.length > 4 && (
            <span className="px-3 py-1 bg-base-bg-secondary dark:bg-dark-border rounded-full text-xs font-medium text-base-text-secondary dark:text-dark-text-secondary">
              +{options.length - 4} more
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 pt-3 md:pt-4 border-t border-base-border dark:border-dark-border/50">
        <div className="flex items-center gap-4 md:gap-6 text-xs font-medium text-base-text-secondary dark:text-dark-text-secondary">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>{totalVotes} votes</span>
          </div>
          {endsIn && status === "active" && (
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Ends in {endsIn}</span>
            </div>
          )}
        </div>
        <button
          onClick={onOpen}
          className="text-xs font-bold text-base-text hover:text-primary dark:text-dark-text dark:hover:text-primary transition-colors"
        >
          View proposal
        </button>
      </div>
    </article>
  );
}

function normalizeOptions(options: Proposal["options"]) {
  if (Array.isArray(options)) return options.map((option) => String(option));
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) return parsed.map((option) => String(option));
    } catch (err) {
      return [];
    }
  }
  return [];
}

function normalizeResults(results: Proposal["results"]): Record<string, number> {
  if (!results) return {};
  if (typeof results === "string") {
    try {
      const parsed = JSON.parse(results);
      return parsed || {};
    } catch (err) {
      return {};
    }
  }
  return results as Record<string, number>;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

function getEndsIn(endDate: string) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return null;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
