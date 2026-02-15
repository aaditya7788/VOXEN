"use client";
import { useState, useEffect } from "react";
import PollCard, { Poll, PollStatus } from "../PollCard";
import { CompassOutline, PeopleOutline, FlashOutline } from "react-ionicons";
import { proposalApi, Proposal } from "@/app/services/proposalApi";

interface Space {
  id: string;
  name: string;
  image: string;
  space_id?: string;
}

interface HomeProps {
  joinedSpaces: Space[];
  onExplore?: () => void;
}

export default function Home({ joinedSpaces, onExplore }: HomeProps) {
  const [randomPolls, setRandomPolls] = useState<(Poll & { spaceName: string; spaceImage: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (joinedSpaces.length === 0) return;

    const fetchFeed = async () => {
      try {
        setIsLoading(true);
        const response = await proposalApi.getUserFeed(20);
        const proposals = response.data || [];

        // Map proposals to Poll format
        const mappedPolls = proposals.map((p) => {
          // Parse options
          let options: string[] = [];
          if (Array.isArray(p.options)) {
            options = p.options;
          } else if (typeof p.options === "string") {
            try {
              options = JSON.parse(p.options);
            } catch (e) {
              options = [];
            }
          }

          // Parse results and calculate percentages
          let results: Record<string, number> = {};
          if (typeof p.results === "string") {
            try {
              results = JSON.parse(p.results);
            } catch (e) { }
          } else {
            results = p.results || {};
          }

          const totalVotes = Object.values(results).reduce((sum, val) => sum + Number(val), 0);

          const pollOptions = options.map((label, index) => {
            const votes = Number(results[index.toString()] || 0);
            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            return {
              label,
              percentage,
              selected: false // We don't have user specific vote selection here easily without extra check
            };
          });

          // Calculate time ago
          const created = new Date(p.created_at);
          const now = new Date();
          const seconds = Math.floor((now.getTime() - created.getTime()) / 1000);
          let timeAgo = "just now";
          if (seconds > 604800) timeAgo = `${Math.floor(seconds / 604800)}w ago`;
          else if (seconds > 86400) timeAgo = `${Math.floor(seconds / 86400)}d ago`;
          else if (seconds > 3600) timeAgo = `${Math.floor(seconds / 3600)}h ago`;
          else if (seconds > 60) timeAgo = `${Math.floor(seconds / 60)}m ago`;

          // Calculate ends in
          const end = new Date(p.end_date);
          const diff = end.getTime() - now.getTime();
          let endsIn;
          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            endsIn = days > 0 ? `${days} days` : `${Math.floor(diff / (1000 * 60 * 60))} hours`;
          }

          return {
            id: p.id,
            author: {
              name: p.creator_username || "Unknown",
              avatar: p.creator_pic || undefined,
              initials: p.creator_username ? p.creator_username.substring(0, 2).toUpperCase() : "UK"
            },
            title: p.title,
            description: p.description || undefined,
            status: p.status as PollStatus,
            timeAgo,
            options: pollOptions,
            votes: p.vote_count || 0,
            endsIn,
            spaceName: p.space_name || "Unknown Space",
            spaceImage: p.space_image || "",
          };
        });

        setRandomPolls(mappedPolls);
      } catch (err) {
        console.error("Failed to load feed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeed();
  }, [joinedSpaces]); // Re-fetch if joinedSpaces changes (e.g. initial load)

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
        {isLoading ? (
          <div className="text-center py-12 text-base-text-secondary dark:text-dark-text-secondary">
            Loading feed...
          </div>
        ) : randomPolls.length > 0 ? (
          randomPolls.map((poll) => (
            <div key={poll.id} className="relative">
              {/* Space Badge */}
              <div className="absolute -top-2 left-3 md:left-4 z-10 flex items-center gap-1.5 md:gap-2 bg-white dark:bg-dark-bg-secondary px-2 md:px-3 py-0.5 md:py-1 rounded-full border border-base-border dark:border-dark-border shadow-sm">
                {poll.spaceImage ? (
                  <img
                    src={poll.spaceImage}
                    alt={poll.spaceName}
                    className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                    {poll.spaceName.charAt(0)}
                  </div>
                )}
                <span className="text-[10px] md:text-xs font-medium text-base-text-secondary dark:text-dark-text-secondary">
                  {poll.spaceName}
                </span>
              </div>
              <div className="pt-2">
                <PollCard poll={poll} />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 md:py-16">
            <p className="text-sm md:text-base text-base-text-secondary dark:text-dark-text-secondary">
              No active polls in your spaces right now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
