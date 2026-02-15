"use client";
import { useState } from "react";
import {
  ArrowBackOutline,
  EllipsisHorizontalOutline,
  LinkOutline,
  LogoTwitter,
  LogoDiscord,
  GlobeOutline,
  PeopleOutline,
  DocumentTextOutline,
  CheckmarkCircleOutline,
  ShareSocialOutline,
  NotificationsOutline,
  SettingsOutline,
  CalendarOutline,
} from "react-ionicons";

interface SpaceProfileProps {
  space?: {
    id: string;
    name: string;
    image?: string;
    logo?: string;
    members?: string;
    proposals?: number;
    description?: string;
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

// Mock data
const recentProposals = [
  {
    id: 1,
    title: "Increase staking rewards by 2%",
    status: "active",
    votes: 1234,
    endDate: "2 days left",
  },
  {
    id: 2,
    title: "Partnership with Protocol XYZ",
    status: "active",
    votes: 856,
    endDate: "5 days left",
  },
  {
    id: 3,
    title: "Treasury allocation for Q1 2026",
    status: "closed",
    votes: 2341,
    endDate: "Ended",
  },
];

const topMembers = [
  { name: "vitalik.eth", votes: 145, avatar: "https://i.pravatar.cc/40?img=1" },
  { name: "hayden.eth", votes: 132, avatar: "https://i.pravatar.cc/40?img=2" },
  { name: "gavin.eth", votes: 98, avatar: "https://i.pravatar.cc/40?img=3" },
  { name: "nick.eth", votes: 87, avatar: "https://i.pravatar.cc/40?img=4" },
];

export default function SpaceProfile({ space, onBack, onNavigate }: SpaceProfileProps) {
  const [activeTab, setActiveTab] = useState("proposals");
  const [isFollowing, setIsFollowing] = useState(false);

  const defaultSpace = {
    id: "aave",
    name: "Aave",
    image: "https://cryptologos.cc/logos/aave-aave-logo.png",
    members: "12.5K",
    proposals: 156,
    description: "Aave is a decentralized non-custodial liquidity protocol where users can participate as depositors or borrowers.",
  }; 

  const currentSpace = space || defaultSpace;
  const spaceImage = currentSpace.image;

  return (
    <div className="flex-1 overflow-y-auto bg-base-bg dark:bg-dark-bg pb-20 md:pb-0">
      {/* Header with Cover */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-32 md:h-48 bg-linear-to-br from-primary via-purple-500 to-pink-500" />
        
        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-3 left-3 md:top-4 md:left-4 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors"
        >
          <ArrowBackOutline width="20px" height="20px" color="currentColor" />
        </button>

        {/* More Options */}
        <button className="absolute top-3 right-3 md:top-4 md:right-4 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors">
          <EllipsisHorizontalOutline width="20px" height="20px" color="currentColor" />
        </button>

        {/* Space Avatar */}
        <div className="absolute -bottom-12 md:-bottom-16 left-4 md:left-6">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-3xl border-4 border-base-bg dark:border-dark-bg bg-white dark:bg-dark-bg-secondary overflow-hidden shadow-xl">
            {spaceImage ? (
              <img
                src={spaceImage}
                alt={currentSpace.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-linear-to-br from-primary to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                {currentSpace.name?.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 md:px-6 pt-14 md:pt-20">
        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mb-4">
          <button className="p-2.5 rounded-full border border-base-border dark:border-dark-border hover:bg-base-bg-secondary dark:hover:bg-dark-border transition-colors">
            <ShareSocialOutline width="18px" height="18px" color="currentColor" />
          </button>
          <button className="p-2.5 rounded-full border border-base-border dark:border-dark-border hover:bg-base-bg-secondary dark:hover:bg-dark-border transition-colors">
            <NotificationsOutline width="18px" height="18px" color="currentColor" />
          </button>
          <button className="p-2.5 rounded-full border border-base-border dark:border-dark-border hover:bg-base-bg-secondary dark:hover:bg-dark-border transition-colors">
            <SettingsOutline width="18px" height="18px" color="currentColor" />
          </button>
          <button
            onClick={() => setIsFollowing(!isFollowing)}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${
              isFollowing
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
        <p className="text-sm md:text-base text-base-text dark:text-dark-text mb-4 leading-relaxed">
          {currentSpace.description}
        </p>

        {/* Links */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-base-text-secondary dark:text-dark-text-secondary">
          <a href="#" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
            <GlobeOutline width="16px" height="16px" color="currentColor" />
            <span>aave.com</span>
          </a>
          <a href="#" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
            <LogoTwitter width="16px" height="16px" color="currentColor" />
            <span>@AaveAave</span>
          </a>
          <a href="#" className="flex items-center gap-1.5 text-sm hover:text-primary transition-colors">
            <LogoDiscord width="16px" height="16px" color="currentColor" />
            <span>Discord</span>
          </a>
          <div className="flex items-center gap-1.5 text-sm">
            <CalendarOutline width="16px" height="16px" color="currentColor" />
            <span>Joined March 2021</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mb-6">
          <button className="group">
            <span className="font-bold text-base-text dark:text-dark-text group-hover:underline">
              {currentSpace.members || "12.5K"}
            </span>
            <span className="text-base-text-secondary dark:text-dark-text-secondary ml-1 text-sm">
              Members
            </span>
          </button>
          <button className="group">
            <span className="font-bold text-base-text dark:text-dark-text group-hover:underline">
              {currentSpace.proposals || 156}
            </span>
            <span className="text-base-text-secondary dark:text-dark-text-secondary ml-1 text-sm">
              Proposals
            </span>
          </button>
          <button className="group">
            <span className="font-bold text-base-text dark:text-dark-text group-hover:underline">
              $2.4M
            </span>
            <span className="text-base-text-secondary dark:text-dark-text-secondary ml-1 text-sm">
              Treasury
            </span>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-base-border dark:border-dark-border -mx-4 md:-mx-6 px-4 md:px-6">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 md:px-6 py-3 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
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
      </div>

      {/* Tab Content */}
      <div className="px-4 md:px-6 py-4 md:py-6">
        {activeTab === "proposals" && (
          <div className="space-y-3">
            {recentProposals.map((proposal) => (
              <button
                key={proposal.id}
                onClick={() => onNavigate?.("proposals")}
                className="w-full p-4 bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border hover:border-primary/50 transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm md:text-base text-base-text dark:text-dark-text mb-1 truncate">
                      {proposal.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-base-text-secondary dark:text-dark-text-secondary">
                      <span className="flex items-center gap-1">
                        <PeopleOutline width="14px" height="14px" color="currentColor" />
                        {proposal.votes} votes
                      </span>
                      <span>{proposal.endDate}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                      proposal.status === "active"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {proposal.status}
                  </span>
                </div>
              </button>
            ))}
            <button
              onClick={() => onNavigate?.("proposals")}
              className="w-full py-3 text-primary font-medium text-sm hover:underline"
            >
              View all proposals →
            </button>
          </div>
        )}

        {activeTab === "about" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide mb-3">
                About
              </h3>
              <p className="text-sm md:text-base text-base-text dark:text-dark-text leading-relaxed">
                {currentSpace.description} The protocol enables users to earn interest on deposits and borrow assets with variable or stable interest rates. Aave is one of the largest DeFi protocols by total value locked.
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
                    1 AAVE = 1 Vote
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide mb-3">
                Networks
              </h3>
              <div className="flex flex-wrap gap-2">
                {["Ethereum", "Polygon", "Arbitrum", "Optimism", "Avalanche"].map((network) => (
                  <span
                    key={network}
                    className="px-3 py-1.5 bg-base-bg-secondary dark:bg-dark-border rounded-full text-xs font-medium text-base-text dark:text-dark-text"
                  >
                    {network}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide mb-3">
                Admins
              </h3>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <img
                    key={i}
                    src={`https://i.pravatar.cc/32?img=${i + 10}`}
                    alt="Admin"
                    className="w-8 h-8 rounded-full border-2 border-base-bg dark:border-dark-bg"
                  />
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-base-bg dark:border-dark-bg bg-base-bg-secondary dark:bg-dark-border flex items-center justify-center text-xs font-medium text-base-text-secondary">
                  +3
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">
                Top Voters
              </h3>
              <button className="text-xs text-primary font-medium">View all</button>
            </div>
            {topMembers.map((member, index) => (
              <div
                key={member.name}
                className="flex items-center gap-3 p-3 bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border"
              >
                <span className="text-sm font-bold text-base-text-secondary dark:text-dark-text-secondary w-6">
                  #{index + 1}
                </span>
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-base-text dark:text-dark-text truncate">
                    {member.name}
                  </p>
                  <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                    {member.votes} votes cast
                  </p>
                </div>
                <button className="px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-full hover:bg-primary/5 transition-colors">
                  View
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-4">
            {[
              { action: "New proposal created", detail: "Increase staking rewards by 2%", time: "2 hours ago", icon: "📝" },
              { action: "Proposal passed", detail: "Update fee structure", time: "1 day ago", icon: "✅" },
              { action: "New member joined", detail: "whale.eth joined the space", time: "2 days ago", icon: "👋" },
              { action: "Treasury transfer", detail: "500K USDC allocated to grants", time: "3 days ago", icon: "💰" },
              { action: "Proposal rejected", detail: "Reduce voting period to 3 days", time: "5 days ago", icon: "❌" },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border"
              >
                <span className="text-xl">{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-base-text dark:text-dark-text">
                    {activity.action}
                  </p>
                  <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary truncate">
                    {activity.detail}
                  </p>
                </div>
                <span className="text-xs text-base-text-secondary dark:text-dark-text-secondary shrink-0">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
