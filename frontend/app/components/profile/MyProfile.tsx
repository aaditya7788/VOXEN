"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Avatar, Name } from "@coinbase/onchainkit/identity";
import { PersonOutline, WalletOutline, CalendarOutline, TrophyOutline, HomeOutline } from "react-ionicons";
import EditProfile from "./EditProfile";
import { profileApi } from "@/app/services/profileApi";

interface UserStats {
  spaces: number;
  proposals: number;
  votes: number;
  owned_spaces: number;
}

interface ActivityItem {
  id: string;
  activity_type: string;
  metadata?: Record<string, any>;
  created_at: string;
  proposal_title?: string;
  space_name?: string;
}

export default function MyProfile() {
  const { address, isConnected } = useAccount();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({ username: "", bio: "", id: "", name: "" });
  const [stats, setStats] = useState<UserStats>({ spaces: 0, proposals: 0, votes: 0, owned_spaces: 0 });
  const [recentVotes, setRecentVotes] = useState<ActivityItem[]>([]);
  const [recentProposals, setRecentProposals] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const shortenedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  // Load user profile data and activities
  useEffect(() => {
    if (!address) return;

    const loadUserData = async () => {
      try {
        setLoading(true);
        const profile = await profileApi.getCurrentProfile();
        setUserProfile({
          username: profile.username || "",
          name: profile.name || "",
          bio: profile.bio || "",
          id: profile.id || "",
        });

        // Load user activities to calculate stats
        const activitiesResult = await profileApi.getCurrentUserActivity(100, 0);
        if (activitiesResult.success) {
          const activities: any[] = activitiesResult.data || [];

          // Count different types of activities
          const votes = activities.filter((a: any) => a.activity_type === 'proposal_voted').length;
          const proposals = activities.filter((a: any) => a.activity_type === 'proposal_created').length;

          // Get spaces directly from backend
          const spacesResult = await profileApi.getUserSpaces(profile.id);
          const userSpacesList = (spacesResult.success && spacesResult.data?.spaces) ? spacesResult.data.spaces : [];

          const spacesOwned = userSpacesList.filter((s: any) => s.user_role === 'owner').length;
          const spacesJoined = userSpacesList.length;

          setStats({
            votes,
            proposals,
            spaces: spacesJoined,
            owned_spaces: spacesOwned,
          });

          // Get recent votes (filter by proposal_voted activity)
          const votes_list = activities.filter((a: any) => a.activity_type === 'proposal_voted').slice(0, 5);
          setRecentVotes(votes_list);

          // Get recent proposals (filter by proposal_created activity)
          const proposals_list = activities.filter((a: any) => a.activity_type === 'proposal_created').slice(0, 5);
          setRecentProposals(proposals_list);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [address]);

  if (!isConnected || !address) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24 pb-20 md:pb-6">
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-base-bg-secondary dark:bg-dark-border flex items-center justify-center mb-4">
            <PersonOutline width="32px" height="32px" color="currentColor" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-base-text dark:text-dark-text mb-2">Connect Your Wallet</h2>
          <p className="text-sm md:text-base text-base-text-secondary dark:text-dark-text-secondary text-center max-w-sm px-4">
            Connect your wallet to view your profile and participate in governance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24 pb-20 md:pb-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
          <div className="relative">
            <Avatar address={address} className="size-20 md:size-24 rounded-full ring-4 ring-primary/20" />
            <div className="absolute bottom-0.5 right-0.5 md:bottom-1 md:right-1 size-4 md:size-5 bg-green-500 border-2 md:border-3 border-white dark:border-dark-bg-secondary rounded-full" />
          </div>
          <div className="flex-1 text-center md:text-left min-w-0">
            <Name address={address} className="text-xl md:text-2xl font-bold text-base-text dark:text-dark-text mb-0.5">
              <span>{userProfile.name || userProfile.username || "Anonymous"}</span>
            </Name>
            {userProfile.name && userProfile.username && (
              <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary font-medium mb-1 truncate">
                @{userProfile.username}
              </p>
            )}
            <p className="text-sm md:text-base text-base-text-secondary dark:text-dark-text-secondary flex items-center justify-center md:justify-start gap-2">
              <WalletOutline width="16px" height="16px" color="currentColor" />
              {shortenedAddress}
            </p>
          </div>
          <button className="bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-5 md:px-6 rounded-full transition-all text-sm md:text-base w-full md:w-auto mt-2 md:mt-0" onClick={() => setIsEditOpen(true)}>
            Edit Profile
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfile
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        currentUsername={userProfile.username}
        currentBio={userProfile.bio}
        onSave={(data) => {
          setUserProfile((prev) => ({
            ...prev,
            username: data.username,
            name: data.displayName,
            bio: data.bio
          }));
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="bg-white dark:bg-dark-bg-secondary rounded-lg md:rounded-xl border border-base-border dark:border-dark-border p-3 md:p-5">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <TrophyOutline width="18px" height="18px" color="#6366f1" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-base-text dark:text-dark-text">{stats.votes}</p>
              <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Votes Cast</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-bg-secondary rounded-lg md:rounded-xl border border-base-border dark:border-dark-border p-3 md:p-5">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
              <CalendarOutline width="18px" height="18px" color="#22c55e" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-base-text dark:text-dark-text">{stats.spaces}</p>
              <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Spaces Joined</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-bg-secondary rounded-lg md:rounded-xl border border-base-border dark:border-dark-border p-3 md:p-5">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
              <PersonOutline width="18px" height="18px" color="#f97316" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-base-text dark:text-dark-text">{stats.proposals}</p>
              <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Proposals</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-bg-secondary rounded-lg md:rounded-xl border border-base-border dark:border-dark-border p-3 md:p-5">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
              <HomeOutline width="18px" height="18px" color="#3b82f6" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-base-text dark:text-dark-text">{stats.owned_spaces}</p>
              <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Spaces Owned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Votes */}
      <div className="bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border p-4 md:p-6 mb-4 md:mb-6">
        <h3 className="text-base md:text-lg font-bold text-base-text dark:text-dark-text mb-3 md:mb-4">Recent Votes</h3>
        {recentVotes.length > 0 ? (
          <div className="space-y-3 md:space-y-4">
            {recentVotes.map((vote, i) => (
              <div key={vote.id} className={`flex items-center justify-between py-2 md:py-3 ${i !== recentVotes.length - 1 ? "border-b border-base-border dark:border-dark-border" : ""}`}>
                <div className="min-w-0 flex-1 mr-3">
                  <p className="font-medium text-sm md:text-base text-base-text dark:text-dark-text truncate">
                    {vote.proposal_title || "Proposal"}
                  </p>
                  <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
                    {vote.space_name || "DAO"} • {formatTimeAgo(vote.created_at)}
                  </p>
                </div>
                <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold shrink-0 bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  Voted
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary">No votes yet</p>
          </div>
        )}
      </div>

      {/* Recent Proposals */}
      {recentProposals.length > 0 && (
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border p-4 md:p-6">
          <h3 className="text-base md:text-lg font-bold text-base-text dark:text-dark-text mb-3 md:mb-4">Recent Proposals</h3>
          <div className="space-y-3 md:space-y-4">
            {recentProposals.map((proposal, i) => (
              <div key={proposal.id} className={`flex items-start justify-between gap-3 py-2 md:py-3 ${i !== recentProposals.length - 1 ? "border-b border-base-border dark:border-dark-border" : ""}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm md:text-base text-base-text dark:text-dark-text truncate">
                    {proposal.proposal_title || "New Proposal"}
                  </p>
                  <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
                    {proposal.space_name || "DAO"} • {formatTimeAgo(proposal.created_at)}
                  </p>
                </div>
                <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold shrink-0 bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  Created
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format time ago
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
