"use client";
import { useState, useEffect } from "react";
import PollCard, { Poll } from "../PollCard";
import { CompassOutline, PeopleOutline, FlashOutline } from "react-ionicons";

interface Space {
  id: string;
  name: string;
  image: string;
}

interface HomeProps {
  joinedSpaces: Space[];
  onExplore?: () => void;
}

// Mock polls data for different spaces
const allSpacePolls: Record<string, Poll[]> = {
  aave: [
    {
      id: 101,
      author: { name: "Aave Team", initials: "AT", badge: "CORE" },
      title: "Should we increase the staking rewards for AAVE holders?",
      description: "Proposal to increase staking APY from 4% to 6% to incentivize long-term holding.",
      status: "active",
      timeAgo: "3h ago",
      options: [
        { label: "Yes, increase to 6%" },
        { label: "Keep current 4%" },
        { label: "Increase to 5% (compromise)" },
      ],
      votes: 1247,
      endsIn: "2 days",
      comments: 89,
    },
    {
      id: 102,
      author: { name: "Risk Committee", avatar: "https://cryptologos.cc/logos/aave-aave-logo.png", badge: "OFFICIAL" },
      title: "Add support for new collateral type: stETH",
      status: "active",
      timeAgo: "1d ago",
      options: [
        { label: "Approve stETH as collateral", percentage: 78, selected: true },
        { label: "Reject proposal", percentage: 22 },
      ],
      votes: 3421,
      hasVoted: true,
    },
  ],
  uniswap: [
    {
      id: 201,
      author: { name: "Uniswap Labs", initials: "UL", badge: "CORE" },
      title: "Deploy Uniswap v4 on Base Network",
      description: "Proposal to expand Uniswap v4 deployment to Base L2 for lower gas fees.",
      status: "active",
      timeAgo: "5h ago",
      options: [
        { label: "Deploy immediately" },
        { label: "Wait for more audits" },
        { label: "Deploy on testnet first" },
      ],
      votes: 892,
      endsIn: "4 days",
      comments: 45,
    },
  ],
  ens: [
    {
      id: 301,
      author: { name: "ENS DAO", avatar: "https://cryptologos.cc/logos/ethereum-name-service-ens-logo.png", badge: "OFFICIAL" },
      title: "Reduce ENS domain renewal fees by 20%",
      description: "Make ENS domains more accessible by reducing annual renewal costs.",
      status: "active",
      timeAgo: "8h ago",
      options: [
        { label: "Yes, reduce by 20%" },
        { label: "Reduce by 10% instead" },
        { label: "Keep current pricing" },
      ],
      votes: 2156,
      endsIn: "5 days",
      comments: 124,
    },
  ],
  compound: [
    {
      id: 401,
      author: { name: "Compound Finance", initials: "CF", badge: "CORE" },
      title: "Upgrade interest rate model for USDC market",
      description: "Implement new dynamic interest rate curve to optimize utilization.",
      status: "active",
      timeAgo: "2h ago",
      options: [
        { label: "Approve new model", percentage: 65, selected: true },
        { label: "Request modifications", percentage: 25 },
        { label: "Reject changes", percentage: 10 },
      ],
      votes: 567,
      hasVoted: true,
    },
  ],
  optimism: [
    {
      id: 501,
      author: { name: "Optimism Collective", initials: "OP", badge: "OFFICIAL" },
      title: "Allocate 500K OP to developer grants program",
      description: "Fund the next round of RetroPGF for public goods builders.",
      status: "active",
      timeAgo: "12h ago",
      options: [
        { label: "Approve full allocation" },
        { label: "Reduce to 300K OP" },
        { label: "Postpone to next quarter" },
      ],
      votes: 4521,
      endsIn: "6 days",
      comments: 203,
    },
  ],
};

export default function Home({ joinedSpaces, onExplore }: HomeProps) {
  const [randomPolls, setRandomPolls] = useState<(Poll & { spaceName: string; spaceImage: string })[]>([]);

  useEffect(() => {
    if (joinedSpaces.length === 0) return;

    // Collect all polls from joined spaces
    const allPolls: (Poll & { spaceName: string; spaceImage: string })[] = [];
    
    joinedSpaces.forEach((space) => {
      const spacePolls = allSpacePolls[space.id] || [];
      spacePolls.forEach((poll) => {
        allPolls.push({
          ...poll,
          spaceName: space.name,
          spaceImage: space.image,
        });
      });
    });

    // Shuffle and pick random polls (max 5)
    const shuffled = allPolls.sort(() => Math.random() - 0.5);
    setRandomPolls(shuffled.slice(0, 5));
  }, [joinedSpaces]);

  // Empty state - no joined spaces
  if (joinedSpaces.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 md:p-6 pb-20 md:pb-6">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <CompassOutline width="40px" height="40px" color="#6366f1" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-base-text dark:text-dark-text mb-2 md:mb-3">
            No spaces joined yet
          </h2>
          <p className="text-sm md:text-base text-base-text-secondary dark:text-dark-text-secondary mb-6 md:mb-8 leading-relaxed">
            Join DAOs and communities to see their polls here. Discover popular spaces and participate in governance decisions.
          </p>
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 md:py-3 px-6 md:px-8 rounded-full shadow-lg shadow-primary/25 transition-all active:scale-[0.98] text-sm md:text-base"
          >
            <CompassOutline width="20px" height="20px" color="currentColor" />
            <span>Explore Spaces</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24 pb-20 md:pb-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white dark:bg-dark-bg-secondary rounded-lg md:rounded-xl border border-base-border dark:border-dark-border p-3 md:p-5">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <PeopleOutline width="18px" height="18px" color="#6366f1" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-base-text dark:text-dark-text">{joinedSpaces.length}</p>
              <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Spaces Joined</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-bg-secondary rounded-lg md:rounded-xl border border-base-border dark:border-dark-border p-3 md:p-5">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <FlashOutline width="18px" height="18px" color="#22c55e" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-base-text dark:text-dark-text">{randomPolls.length}</p>
              <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Active Polls</p>
            </div>
          </div>
        </div>
        <div className="col-span-2 md:col-span-1 bg-linear-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-lg md:rounded-xl border border-primary/20 p-3 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-base-text dark:text-dark-text mb-0.5 md:mb-1">Discover more</p>
              <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">Find new communities</p>
            </div>
            <button
              onClick={onExplore}
              className="bg-primary hover:bg-primary-hover text-white text-xs md:text-sm font-semibold py-1.5 md:py-2 px-3 md:px-4 rounded-full transition-all"
            >
              Explore
            </button>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h3 className="text-base md:text-lg font-bold text-base-text dark:text-dark-text">Your Feed</h3>
          <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">Latest polls from your spaces</p>
        </div>
      </div>

      {/* Polls Feed */}
      <div className="space-y-4 md:space-y-5">
        {randomPolls.map((poll) => (
          <div key={poll.id} className="relative">
            {/* Space Badge */}
            <div className="absolute -top-2 left-3 md:left-4 z-10 flex items-center gap-1.5 md:gap-2 bg-white dark:bg-dark-bg-secondary px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-base-border dark:border-dark-border shadow-sm">
              <img
                src={poll.spaceImage}
                alt={poll.spaceName}
                className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full object-cover"
              />
              <span className="text-[10px] md:text-xs font-medium text-base-text-secondary dark:text-dark-text-secondary">
                {poll.spaceName}
              </span>
            </div>
            <div className="pt-2">
              <PollCard poll={poll} />
            </div>
          </div>
        ))}
      </div>

      {randomPolls.length === 0 && joinedSpaces.length > 0 && (
        <div className="text-center py-12 md:py-16">
          <p className="text-sm md:text-base text-base-text-secondary dark:text-dark-text-secondary">
            No active polls in your spaces right now.
          </p>
        </div>
      )}
    </div>
  );
}
