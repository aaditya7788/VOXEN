"use client";
import { useState, useEffect, useRef } from "react";
import IconSidebar from "../components/IconSidebar";
import SecondarySidebar from "../components/SecondarySidebar";
import { SearchOutline, CheckmarkCircle, MenuOutline } from "react-ionicons";
import { Avatar } from "@coinbase/onchainkit/identity";
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";

interface ExploreScreenProps {
  onNavigate?: (screen: "home" | "explore") => void;
}

const filters = ["All", "DAO", "DeFi", "Gaming", "NFTs", "Social", "Infrastructure", "Protocol", "Education", "Art", "Music"];


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// Helper function to extract dominant color from image
function useDominantColor(imageUrl: string, fallbackColor: string) {
  const [color, setColor] = useState(fallbackColor);

  useEffect(() => {
    if (!imageUrl) {
      setColor(fallbackColor);
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);

      try {
        const imageData = ctx.getImageData(0, 0, 50, 50);
        const data = imageData.data;
        let r = 0, g = 0, b = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          // Skip very dark or very light pixels
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (brightness > 30 && brightness < 220) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          setColor(`rgb(${r}, ${g}, ${b})`);
        }
      } catch {
        setColor(fallbackColor);
      }
    };

    img.onerror = () => setColor(fallbackColor);
  }, [imageUrl, fallbackColor]);

  return color;
}

// Community Card Component
interface Community {
  id: string;
  name: string;
  description: string;
  avatar: string;
  fallbackColor: string;
  trending: boolean;
  verified: boolean;
  members: number | string;
  activePolls: number;
  category: string;
}

function CommunityCard({ community, isJoined, onJoin, isJoining }: { community: Community; isJoined: boolean; onJoin: () => void; isJoining?: boolean }) {
  const dominantColor = useDominantColor(community.avatar, community.fallbackColor);

  return (
    <div className="bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border overflow-hidden hover:shadow-lg transition-shadow">
      {/* Gradient Header */}
      <div
        className="h-20 md:h-24 relative"
        style={{ background: `linear-gradient(135deg, ${dominantColor}, ${dominantColor}dd)` }}
      >
        {community.trending && (
          <span className="absolute top-2 md:top-3 left-2 md:left-3 bg-white/90 text-[10px] md:text-xs font-semibold px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-base-text">
            Trending
          </span>
        )}
        {/* Avatar - moved inside header */}
        <div className="absolute -bottom-5 md:-bottom-6 left-4 md:left-5">
          {community.avatar ? (
            <div
              className="size-10 md:size-12 rounded-full bg-cover bg-center ring-3 md:ring-4 ring-white dark:ring-dark-bg-secondary"
              style={{ backgroundImage: `url('${community.avatar}')` }}
            />
          ) : (
            <div
              className="size-10 md:size-12 rounded-full ring-3 md:ring-4 ring-white dark:ring-dark-bg-secondary flex items-center justify-center text-white font-bold text-base md:text-lg"
              style={{ backgroundColor: dominantColor }}
            >
              {community.name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-5 pt-6 md:pt-8">
        {/* Info */}
        <div className="flex items-center gap-1.5 mb-1.5 md:mb-2">
          <h3 className="font-semibold text-sm md:text-base text-base-text dark:text-dark-text">{community.name}</h3>
          {community.verified && (
            <CheckmarkCircle width="14px" height="14px" color="#3b82f6" />
          )}
        </div>
        <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary line-clamp-2 mb-3 md:mb-4 min-h-10 md:min-h-12">
          {community.description}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs md:text-sm mb-3 md:mb-4">
          <div>
            <span className="text-base-text-secondary dark:text-dark-text-secondary">Members</span>
            <p className="font-semibold text-base-text dark:text-dark-text">{community.members}</p>
          </div>
          <div className="text-right">
            <span className="text-base-text-secondary dark:text-dark-text-secondary">Active Polls</span>
            <p className="font-semibold text-base-text dark:text-dark-text flex items-center justify-end gap-1">
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {community.activePolls}
            </p>
          </div>
        </div>

        {/* Join Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isJoined) onJoin();
          }}
          disabled={isJoined || isJoining}
          className={`w-full py-2 md:py-2.5 font-semibold text-xs md:text-sm rounded-lg transition-all ${isJoined
            ? "bg-base-bg-secondary dark:bg-dark-border text-base-text-secondary dark:text-dark-text-secondary cursor-default"
            : "bg-primary hover:bg-primary-hover text-white shadow-md hover:shadow-lg active:scale-[0.98]"
            } flex items-center justify-center gap-2`}
        >
          {isJoining ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isJoined ? (
            <>
              <CheckmarkCircle width="16px" height="16px" color="currentColor" />
              Joined
            </>
          ) : (
            "Join Space"
          )}
        </button>
      </div>
    </div>
  );
}

export default function ExploreScreen({ onNavigate }: ExploreScreenProps) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [allSpaces, setAllSpaces] = useState<any[]>([]);
  const [userSpaces, setUserSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [spacesRefreshKey, setSpacesRefreshKey] = useState(0);

  // Receive user's joined spaces from IconSidebar
  const handleSpacesUpdate = (spaces: any[]) => {
    setUserSpaces(spaces);
  };

  // Function to refresh spaces in sidebar
  const refreshSpaces = () => {
    setSpacesRefreshKey(prev => prev + 1);
  };

  // Fetch all spaces for discovery grid
  useEffect(() => {
    const fetchAllSpaces = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/spaces`);
        if (response.ok) {
          const data = await response.json();
          setAllSpaces(data.data || []);
        }
      } catch (e) {
        setAllSpaces([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAllSpaces();
  }, []);

  const [isJoining, setIsJoining] = useState<string | null>(null);

  // Join a space directly
  const handleJoinSpace = async (spaceId: string) => {
    const token = localStorage.getItem("voxen_token");
    if (!token) {
      alert("Please connect your wallet to join a space.");
      return;
    }

    setIsJoining(spaceId);
    try {
      const response = await fetch(`${API_URL}/spaces/${spaceId}/join`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        // Refresh spaces after joining
        refreshSpaces();
      } else {
        const errorData = await response.json();
        console.error("Failed to join space:", errorData);
      }
    } catch (e) {
      console.error("Error joining space:", e);
    } finally {
      setIsJoining(null);
    }
  };

  const handleSidebarSelect = (type: "nav" | "space", id: string) => {
    if (type === "nav") {
      if (id === "home" || id === "profile") {
        onNavigate?.("home");
      }
    } else if (type === "space") {
      onNavigate?.("home");
    }
  };

  const filteredSpaces = allSpaces.filter((space) => {
    const matchesFilter = activeFilter === "All" || (space.category === activeFilter);
    const matchesSearch = space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (space.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesFilter && matchesSearch;
  });

  // Check if a space is joined by looking at the userSpaces
  const checkIsJoined = (spaceId: string) => {
    return userSpaces.some((us) => us.space_id === spaceId || us.id === spaceId);
  };

  return (
    <div className="bg-base-bg-secondary dark:bg-dark-bg font-sans text-base-text dark:text-dark-text h-screen w-full overflow-hidden flex antialiased">
      <IconSidebar
        onSelectOption={handleSidebarSelect}
        activeNavId="explore"
        selectedSpaceId=""
        onCreateSpace={() => {
          onNavigate?.("home");
        }}
        onJoinSpace={(spaceOrInvite) => {
          refreshSpaces();
        }}
        refreshKey={spacesRefreshKey}
        onSpacesUpdate={handleSpacesUpdate}
      />

      <SecondarySidebar
        visible={true}
        activeView="explore"
        isHomeView={true}
        isMobileOpen={isMobileSidebarOpen}
        onToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        refreshKey={spacesRefreshKey}
        userSpaces={userSpaces}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-base-bg-secondary dark:bg-dark-bg relative overflow-y-auto pb-16 md:pb-0">
        <div className="p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24">
          {/* Header */}
          <div className="mb-5 md:mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-3 md:gap-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 text-base-text-secondary hover:text-base-text dark:hover:text-dark-text transition-colors mt-0.5"
              >
                <MenuOutline width="24px" height="24px" color="currentColor" />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-base-text dark:text-dark-text mb-1 md:mb-2">Discover Base Communities</h1>
                <p className="text-xs md:text-sm lg:text-base text-base-text-secondary dark:text-dark-text-secondary">
                  Find and join the most active governance groups, DAOs, and<span className="hidden md:inline"><br /></span> social clubs on the Base ecosystem.
                </p>
              </div>
            </div>
            <div className="hidden md:block">
              <Wallet>
                <ConnectWallet className="bg-transparent p-0">
                  <Avatar className="h-8 w-8 rounded-full" />
                </ConnectWallet>
                <WalletDropdown>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-3 md:gap-4 mb-5 md:mb-8">
            {/* Search */}
            <div className="relative w-full md:max-w-md">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-text-secondary">
                <SearchOutline width="18px" height="18px" color="currentColor" />
              </div>
              <input
                type="text"
                placeholder="Search communities, tokens, or DAOs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 bg-white dark:bg-dark-bg-secondary border border-base-border dark:border-dark-border rounded-full text-xs md:text-sm text-base-text dark:text-dark-text placeholder:text-base-text-secondary/70 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Filters - horizontal scroll on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-full transition-colors whitespace-nowrap shrink-0 ${activeFilter === filter
                    ? "bg-primary text-white"
                    : "bg-white dark:bg-dark-bg-secondary text-base-text-secondary dark:text-dark-text-secondary border border-base-border dark:border-dark-border hover:border-primary hover:text-primary"
                    }`}
                >
                  {filter}
                </button>
              ))}
              <button className="p-1.5 md:p-2 rounded-full border border-base-border dark:border-dark-border text-base-text-secondary hover:border-primary hover:text-primary transition-colors shrink-0">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Communities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 pb-4 md:pb-12">
            {loading ? (
              <div className="col-span-full text-center py-8">Loading spaces...</div>
            ) : filteredSpaces.length === 0 ? (
              <div className="col-span-full text-center py-8">No spaces found.</div>
            ) : (
              filteredSpaces.map((space) => (
                <CommunityCard
                  key={space.id}
                  community={{
                    ...space,
                    avatar: space.logo || space.image || "",
                    fallbackColor: "#3b82f6",
                    trending: false,
                    verified: true,
                    members: space.members || "-",
                    activePolls: space.activePolls || 0,
                    category: space.category || "All",
                  }}
                  isJoined={checkIsJoined(space.id)}
                  onJoin={() => handleJoinSpace(space.id)}
                  isJoining={isJoining === space.id}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
