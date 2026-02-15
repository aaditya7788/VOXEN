"use client";
import { useState, useEffect } from "react";
import {
  ArrowBackOutline,
  EllipsisHorizontalOutline,
  GlobeOutline,
  PeopleOutline,
  DocumentTextOutline,
  CheckmarkCircleOutline,
  ShareSocialOutline,
  NotificationsOutline,
  SettingsOutline,
  CalendarOutline,
  LogoTwitter,
  LogoDiscord
} from "react-ionicons";
import { proposalApi, Proposal } from "@/app/services/proposalApi";
import Activity from "./Activity";
import Members from "./Members";

interface SpaceProfileProps {
  space?: {
    id: string; // likely the slug/handle
    space_id?: string; // UUID
    name: string;
    image?: string;
    logo?: string;
    profile_pic?: string;
    cover_image?: string;
    members?: string | number;
    member_count?: number;
    proposals?: number;
    proposal_count?: number;
    description?: string;
    created_at?: string;
    joined_at?: string;
    website?: string;
    [key: string]: any;
  };
  onBack?: () => void;
  onNavigate?: (view: string) => void;
}

const tabs = [
  { id: "proposals", label: "Proposals" },
  { id: "about", label: "About" },
  { id: "members", label: "Members" },
  { id: "activity", label: "Activity" },
];

export default function SpaceProfile({ space, onBack, onNavigate }: SpaceProfileProps) {
  const [activeTab, setActiveTab] = useState("proposals");
  const [isFollowing, setIsFollowing] = useState(false);

  // Real data state
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);

  // Use the passed space or a fallback
  const currentSpace = space || {
    id: "unknown",
    name: "Unknown Space",
    description: "No description available",
    created_at: new Date().toISOString(),
  };

  // Resolve IDs: prefer UUID (space_id) for API calls, fallback to id (might be slug)
  const spaceIdForApi = currentSpace.space_id || currentSpace.id;
  const spacePosterImage = currentSpace.cover_image || null;
  const spaceLogo = currentSpace.profile_pic || currentSpace.image || currentSpace.logo || null;

  useEffect(() => {
    if (activeTab === "proposals" && spaceIdForApi && spaceIdForApi !== "unknown") {
      fetchProposals();
    }
  }, [activeTab, spaceIdForApi]);

  useEffect(() => {
    if (currentSpace.user_role) {
      setIsFollowing(true);
    }
  }, [currentSpace.user_role]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      // In a real app we'd use a toast here
      alert("Link copied to clipboard!");
    }
  };

  const fetchProposals = async () => {
    setIsLoadingProposals(true);
    try {
      const response = await proposalApi.getSpaceProposals(spaceIdForApi, {
        limit: 10,
        sortBy: "created_at",
        sortOrder: "DESC"
      });
      setProposals(response.data || []);
    } catch (error) {
      console.error("Failed to fetch proposals:", error);
    } finally {
      setIsLoadingProposals(false);
    }
  };

  const handleProposalClick = (proposalId: string) => {
    if (onNavigate) {
      // Store the proposal ID so Proposals component opens it
      sessionStorage.setItem("openProposalId", proposalId);
      onNavigate("proposals");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
      case "closed":
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"; // improved contrast
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400";
      case "cancelled":
        return "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-base-bg dark:bg-dark-bg pb-20 md:pb-0 h-full">
      {/* Header with Cover */}
      <div className="relative shrink-0">
        {/* Cover Image */}
        <div className={`h-32 md:h-48 w-full ${spacePosterImage ? "" : "bg-linear-to-br from-primary via-purple-500 to-pink-500"}`}>
          {spacePosterImage && <img src={spacePosterImage} alt="Cover" className="w-full h-full object-cover" />}
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 md:top-4 md:left-4 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors z-10"
        >
          <ArrowBackOutline width="20px" height="20px" color="currentColor" />
        </button>

        {/* More Options */}
        <button className="absolute top-3 right-3 md:top-4 md:right-4 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors z-10">
          <EllipsisHorizontalOutline width="20px" height="20px" color="currentColor" />
        </button>

        {/* Space Avatar */}
        <div className="absolute -bottom-12 md:-bottom-16 left-4 md:left-6 z-20">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-3xl border-4 border-base-bg dark:border-dark-bg bg-white dark:bg-dark-bg-secondary overflow-hidden shadow-xl">
            {spaceLogo ? (
              <img
                src={spaceLogo}
                alt={currentSpace.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-primary to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                {currentSpace.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 md:px-6 pt-14 md:pt-20 pb-6">
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={handleShare}
            className="p-2.5 rounded-full border border-base-border dark:border-dark-border hover:bg-base-bg-secondary dark:hover:bg-dark-border transition-colors text-base-text dark:text-dark-text"
          >
            <ShareSocialOutline width="18px" height="18px" color="currentColor" />
          </button>
          {/* <button className="p-2.5 rounded-full border border-base-border dark:border-dark-border hover:bg-base-bg-secondary dark:hover:bg-dark-border transition-colors text-base-text dark:text-dark-text">
            <NotificationsOutline width="18px" height="18px" color="currentColor" />
          </button> */}
          <button
            onClick={() => onNavigate?.("update-space")}
            className="p-2.5 rounded-full border border-base-border dark:border-dark-border hover:bg-base-bg-secondary dark:hover:bg-dark-border transition-colors text-base-text dark:text-dark-text"
            title="Update Space"
          >
            <SettingsOutline width="18px" height="18px" color="currentColor" />
          </button>
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${isFollowing
              ? "bg-transparent border-2 border-base-border dark:border-dark-border text-base-text dark:text-dark-text hover:border-red-500 hover:text-red-500"
              : "bg-primary hover:bg-primary-hover text-white"
              }`}
          >
            {isFollowing ? "Joined" : "Join Space"}
          </button>
        </div>

        {/* Name & Verification */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl md:text-2xl font-bold text-base-text dark:text-dark-text">
            {currentSpace.name}
          </h1>
          <CheckmarkCircleOutline width="22px" height="22px" color="#3b82f6" />
        </div>

        {/* Handle */}
        <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary mb-3">
          @{currentSpace.id}
        </p>

        {/* Description */}
        <p className="text-sm md:text-base text-base-text dark:text-dark-text mb-4 leading-relaxed max-w-2xl">
          {currentSpace.description || "No description provided."}
        </p>

        {/* Links */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-base-text-secondary dark:text-dark-text-secondary">
          {currentSpace.website && (
            <a href={currentSpace.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
              <GlobeOutline width="16px" height="16px" color="currentColor" />
              <span>Website</span>
            </a>
          )}

          <div className="flex items-center gap-1.5 text-sm">
            <CalendarOutline width="16px" height="16px" color="currentColor" />
            <span>Joined {formatDate(currentSpace.joined_at || currentSpace.created_at)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mb-6">
          <div className="group cursor-pointer">
            <span className="font-bold text-base-text dark:text-dark-text group-hover:underline">
              {currentSpace.member_count || currentSpace.members || "0"}
            </span>
            <span className="text-base-text-secondary dark:text-dark-text-secondary ml-1 text-sm">
              Members
            </span>
          </div>
          <div className="group cursor-pointer">
            <span className="font-bold text-base-text dark:text-dark-text group-hover:underline">
              {currentSpace.proposal_count || currentSpace.proposals || "0"}
            </span>
            <span className="text-base-text-secondary dark:text-dark-text-secondary ml-1 text-sm">
              Proposals
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-base-border dark:border-dark-border -mx-4 md:-mx-6 px-4 md:px-6 sticky top-0 bg-base-bg dark:bg-dark-bg z-10">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 md:px-6 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id
                  ? "text-base-text dark:text-dark-text"
                  : "text-base-text-secondary dark:text-dark-text-secondary hover:text-base-text dark:hover:text-dark-text"
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="py-4 md:py-6 min-h-[300px]">
          {activeTab === "proposals" && (
            <div className="space-y-3">
              {isLoadingProposals && (
                <div className="text-center py-12 text-base-text-secondary">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  Loading proposals...
                </div>
              )}

              {!isLoadingProposals && proposals.length === 0 && (
                <div className="text-center py-12 text-base-text-secondary bg-base-bg-secondary dark:bg-dark-bg-secondary rounded-xl border border-dotted border-base-border dark:border-dark-border">
                  <DocumentTextOutline width="32px" height="32px" color="currentColor" className="mx-auto mb-2 opacity-50" />
                  No proposals found
                </div>
              )}

              {!isLoadingProposals && proposals.map((proposal) => (
                <button
                  key={proposal.id}
                  onClick={() => handleProposalClick(proposal.id)}
                  className="w-full p-4 bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border hover:border-primary/50 transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm md:text-base text-base-text dark:text-dark-text mb-1 truncate group-hover:text-primary transition-colors">
                        {proposal.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-base-text-secondary dark:text-dark-text-secondary">
                        <span className="flex items-center gap-1">
                          <PeopleOutline width="14px" height="14px" color="currentColor" />
                          {proposal.vote_count || 0} votes
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${proposal.voting_type === 'single' ? 'border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400' :
                          proposal.voting_type === 'multiple' ? 'border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400' :
                            'border-orange-200 text-orange-600 dark:border-orange-800 dark:text-orange-400'
                          }`}>
                          {proposal.voting_type}
                        </span>
                        <span>Ends {formatDate(proposal.end_date)}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${getStatusStyle(proposal.status)}`}
                    >
                      {proposal.status}
                    </span>
                  </div>
                </button>
              ))}

              {proposals.length > 0 && (
                <button
                  onClick={() => onNavigate?.("proposals")}
                  className="w-full py-3 text-primary font-medium text-sm hover:underline"
                >
                  View all proposals →
                </button>
              )}
            </div>
          )}

          {activeTab === "about" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide mb-3">
                  About
                </h3>
                <p className="text-sm md:text-base text-base-text dark:text-dark-text leading-relaxed">
                  {currentSpace.description || "No description provided."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide mb-3">
                  Voting Strategy
                </h3>
                <div className="flex items-center gap-3 p-3 bg-base-bg-secondary dark:bg-dark-border rounded-xl">
                  <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DocumentTextOutline width="20px" height="20px" color="#6366f1" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-base-text dark:text-dark-text">Token Weighted</p>
                    <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                      1 Token = 1 Vote
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide mb-3">
                  Networks
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 bg-base-bg-secondary dark:bg-dark-border rounded-full text-xs font-medium text-base-text dark:text-dark-text">
                    Ethereum
                  </span>
                  <span className="px-3 py-1.5 bg-base-bg-secondary dark:bg-dark-border rounded-full text-xs font-medium text-base-text dark:text-dark-text">
                    Base
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "members" && (
            <Members spaceId={spaceIdForApi !== "unknown" ? spaceIdForApi : undefined} />
          )}

          {activeTab === "activity" && (
            <Activity spaceId={spaceIdForApi !== "unknown" ? spaceIdForApi : undefined} onProposalClick={handleProposalClick} />
          )}
        </div>
      </div>
    </div>
  );
}
