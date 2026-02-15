"use client";
import { useState, useEffect, useRef, JSX } from "react";
import { useAccount } from "wagmi";
import { HomeOutline, CompassOutline, AddOutline, CloseOutline, LinkOutline, AddCircleOutline, PersonOutline, EditOutline } from "react-ionicons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const navItems = [
  { id: "home", icon: "home", tooltip: "Home" },
  { id: "explore", icon: "explore", tooltip: "Explore" },
];



interface UserSpace {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  user_role: string;
  username?: string | null;
  invite_token?: string | null;
}

interface NavIconProps {
  icon?: string;
  tooltip: string;
  image?: string;
  active?: boolean;
  selected?: boolean;
  onClick?: () => void;
  isSpace?: boolean;
}

function NavIcon({
  icon,
  tooltip,
  image,
  active,
  selected,
  onClick,
  isSpace,
}: NavIconProps) {
  const iconMap: Record<string, JSX.Element> = {
    home: <HomeOutline width="24px" height="24px" color="currentColor" />,
    explore: <CompassOutline width="24px" height="24px" color="currentColor" />,
  };

  // Space with image
  if (image) {
    return (
      <button
        onClick={onClick}
        className="group relative flex items-center justify-center w-full"
      >
        {selected ? (
          <div className="absolute left-0 w-1 h-10 bg-primary rounded-r-full transition-all duration-200" />
        ) : (
          <div className="absolute left-0 w-1 h-8 bg-base-text dark:bg-white rounded-r-full opacity-0 group-hover:opacity-100 transition-all scale-y-0 group-hover:scale-y-75 duration-200 origin-left" />
        )}

        <div
          className={`size-12 rounded-3xl ${
            selected
              ? "rounded-2xl shadow-glow ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-dark-bg-secondary"
              : "group-hover:rounded-2xl hover:shadow-md ring-1 ring-base-border dark:ring-dark-border group-hover:ring-transparent"
          } bg-cover bg-center cursor-pointer transition-all duration-200`}
          style={{ backgroundImage: `url('${image}')` }}
        />

        <div className="absolute left-full ml-4 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg font-bold tracking-wide hidden md:block">
          {tooltip}
        </div>
      </button>
    );
  }

  // Space without image (show initial)
  if (isSpace) {
    return (
      <button
        onClick={onClick}
        className="group relative flex items-center justify-center w-full"
      >
        {selected ? (
          <div className="absolute left-0 w-1 h-10 bg-primary rounded-r-full transition-all duration-200" />
        ) : (
          <div className="absolute left-0 w-1 h-8 bg-base-text dark:bg-white rounded-r-full opacity-0 group-hover:opacity-100 transition-all scale-y-0 group-hover:scale-y-75 duration-200 origin-left" />
        )}

        <div
          className={`size-12 rounded-3xl bg-linear-to-br from-primary to-blue-400 text-white font-bold text-lg ${
            selected
              ? "rounded-2xl shadow-glow ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-dark-bg-secondary"
              : "group-hover:rounded-2xl hover:shadow-md"
          } flex items-center justify-center cursor-pointer transition-all duration-200`}
        >
          {tooltip.charAt(0).toUpperCase()}
        </div>

        <div className="absolute left-full ml-4 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg font-bold tracking-wide hidden md:block">
          {tooltip}
        </div>
      </button>
    );
  }

  // Nav icon
  return (
    <button
      onClick={onClick}
      className="group relative flex items-center justify-center w-full"
    >
      {active ? (
        <div className="absolute left-0 w-1 h-10 bg-primary rounded-r-full transition-all duration-200" />
      ) : (
        <div className="absolute left-0 w-1 h-8 bg-base-text dark:bg-white rounded-r-full opacity-0 group-hover:opacity-100 transition-all scale-y-0 group-hover:scale-y-75 duration-200 origin-left" />
      )}

      <div
        className={`size-12 rounded-3xl group-hover:rounded-2xl ${
          active
            ? "bg-primary text-white shadow-glow"
            : "bg-base-bg-secondary dark:bg-dark-border group-hover:bg-primary text-base-text dark:text-dark-text group-hover:text-white"
        } flex items-center justify-center cursor-pointer transition-all duration-200 shadow-soft hover:shadow-glow`}
      >
        {icon && iconMap[icon]}
      </div>

      <div className="absolute left-full ml-4 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg font-bold tracking-wide hidden md:block">
        {tooltip}
      </div>
    </button>
  );
}

interface IconSidebarProps {
  onSelectOption?: (type: "nav" | "space", id: string) => void;
  activeNavId?: string;
  selectedSpaceId?: string;
  onCreateSpace?: () => void;
  // onJoinSpace will be called with the joined `space` object (or invite string on fallback)
  onJoinSpace?: (spaceOrInvite: any) => void;
  refreshKey?: number;
  onSpacesUpdate?: (spaces: {
    id: string;
    name: string;
    tooltip: string;
    image: string;
    space_id?: string;
    slug?: string;
    user_role?: string;
    username?: string | null;
    invite_token?: string | null;
  }[]) => void;
}

// Add Space Modal Component
function AddSpaceModal({ isOpen, onClose, onCreateSpace, onJoinSpace }: {
  isOpen: boolean;
  onClose: () => void;
  onCreateSpace?: () => void;
  onJoinSpace?: (inviteLink: string) => void;
}) {
  const [mode, setMode] = useState<"menu" | "join">("menu");
  const [inviteLink, setInviteLink] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
        setMode("menu");
        setInviteLink("");
      }
    };

    if (isOpen) {
      // Add a small delay to prevent the click that opened the modal from immediately closing it
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 10);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleJoinSubmit = async () => {
    if (inviteLink.trim()) {
      // Extract invite_token from link or use as-is
      let inviteToken = inviteLink.trim();
      const match = inviteToken.match(/invite\/([\w-]+)/);
      if (match) inviteToken = match[1];
      // Call backend join-by-link endpoint
      const token = localStorage.getItem("voxen_token");
      try {
        const res = await fetch(`${API_URL}/spaces/join-by-link`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ invite: inviteToken })
        });
        if (res.ok) {
          const result = await res.json();
          // Notify parent about successful join with returned space if available
          onJoinSpace?.(result.space || inviteToken);
        } else {
          const err = await res.json().catch(() => null);
          onJoinSpace?.(null);
          console.error('Join failed', err);
        }
      } catch (e) {
        onJoinSpace?.(null);
        console.error('Join error', e);
      }
      setInviteLink("");
      setMode("menu");
      onClose();
    }
  };

  const handleCreateClick = () => {
    onCreateSpace?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - always visible */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      
      {/* Modal - Bottom sheet on mobile, centered dialog on desktop */}
      <div 
        ref={modalRef}
        className="fixed inset-x-0 bottom-0 w-full bg-white dark:bg-dark-bg-secondary rounded-t-2xl shadow-2xl border-t border-base-border dark:border-dark-border z-50 overflow-hidden animate-in slide-in-from-bottom duration-200 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-100 md:max-w-[90vw] md:rounded-xl md:border md:border-t md:fade-in md:zoom-in-95"
      >
      {mode === "menu" ? (
        <>
          {/* Drag handle for mobile */}
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 bg-base-border dark:bg-dark-border rounded-full" />
          </div>
          <div className="p-4 border-b border-base-border dark:border-dark-border">
            <h3 className="text-base font-bold text-base-text dark:text-dark-text">Add a Space</h3>
            <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary mt-1">
              Create your own space or join an existing one
            </p>
          </div>
          <div className="p-3 md:p-2">
            <button
              onClick={handleCreateClick}
              className="w-full flex items-center gap-4 md:gap-3 p-4 md:p-3 rounded-lg hover:bg-base-bg-secondary dark:hover:bg-dark-border/50 active:bg-base-bg-secondary dark:active:bg-dark-border/50 transition-colors group"
            >
              <div className="size-12 md:size-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-active:bg-primary group-hover:text-white group-active:text-white transition-colors">
                <AddCircleOutline width="22px" height="22px" color="currentColor" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base md:text-sm font-semibold text-base-text dark:text-dark-text">Create a Space</p>
                <p className="text-sm md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Start a new community</p>
              </div>
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full flex items-center gap-4 md:gap-3 p-4 md:p-3 rounded-lg hover:bg-base-bg-secondary dark:hover:bg-dark-border/50 active:bg-base-bg-secondary dark:active:bg-dark-border/50 transition-colors group"
            >
              <div className="size-12 md:size-10 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 group-hover:bg-green-500 group-active:bg-green-500 group-hover:text-white group-active:text-white transition-colors">
                <LinkOutline width="22px" height="22px" color="currentColor" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base md:text-sm font-semibold text-base-text dark:text-dark-text">Join a Space</p>
                <p className="text-sm md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Enter an invite link</p>
              </div>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Drag handle for mobile */}
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 bg-base-border dark:bg-dark-border rounded-full" />
          </div>
          <div className="p-4 border-b border-base-border dark:border-dark-border flex items-center gap-2">
            <button 
              onClick={() => setMode("menu")}
              className="text-base-text-secondary hover:text-base-text dark:hover:text-dark-text transition-colors"
            >
              <CloseOutline width="20px" height="20px" color="currentColor" />
            </button>
            <h3 className="text-base font-bold text-base-text dark:text-dark-text">Join a Space</h3>
          </div>
          <div className="p-5 md:p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide mb-2">
                Invite Link
              </label>
              <input
                type="text"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="https://voxen.xyz/invite/abc123"
                className="w-full px-4 md:px-3 py-3.5 md:py-2.5 bg-base-bg-secondary dark:bg-dark-border rounded-lg border border-base-border dark:border-dark-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base md:text-sm text-base-text dark:text-dark-text placeholder:text-base-text-secondary/50 dark:placeholder:text-dark-text-secondary/50 transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleJoinSubmit()}
                autoComplete="off"
                autoCapitalize="off"
              />
              <p className="text-sm md:text-xs text-base-text-secondary dark:text-dark-text-secondary mt-2">
                Example: https://voxen.xyz/invite/abc123 or just the invite code
              </p>
            </div>
            <button
              onClick={handleJoinSubmit}
              disabled={!inviteLink.trim()}
              className="w-full py-3.5 md:py-2.5 bg-primary hover:bg-primary-hover active:bg-primary-hover disabled:bg-base-bg-secondary disabled:dark:bg-dark-border disabled:text-base-text-secondary disabled:dark:text-dark-text-secondary text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed text-base md:text-sm"
            >
              Join Space
            </button>
          </div>
        </>
      )}
      {/* Safe area padding for mobile devices with notch/home indicator */}
      <div className="h-safe-area-inset-bottom md:hidden" />
    </div>
    </>
  );
}

export default function IconSidebar({ onSelectOption, activeNavId, selectedSpaceId, onCreateSpace, onJoinSpace, refreshKey = 0, onSpacesUpdate }: IconSidebarProps) {
  const { isConnected } = useAccount();
  const [activeNav, setActiveNav] = useState(activeNavId || "home");
  const [selectedSpace, setSelectedSpace] = useState(selectedSpaceId || "");
  const [showAddModal, setShowAddModal] = useState(false);
  const [userSpaces, setUserSpaces] = useState<UserSpace[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure client-side rendering to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper function to get cached spaces
  const getCachedSpaces = () => {
    try {
      const cached = localStorage.getItem("voxen_user_spaces");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  };

  // Helper function to save spaces to cache
  const cacheSpaces = (spaces: UserSpace[]) => {
    try {
      localStorage.setItem("voxen_user_spaces", JSON.stringify(spaces));
    } catch (error) {
      console.error("Failed to cache spaces:", error);
    }
  };

  // Helper function to convert to display format
  const toDisplayFormat = (spaces: UserSpace[]) => {
    return spaces.map((s: any) => ({
      id: s.slug,
      space_id: s.id,
      slug: s.slug,
      name: s.name,
      tooltip: s.name,
      image: s.logo || "",
      user_role: s.user_role,
      username: s.username || null,
      invite_token: s.invite_token || null,
    }));
  };

  // Fetch user's spaces with caching
  useEffect(() => {
    const fetchUserSpaces = async () => {
      if (!isConnected) {
        setUserSpaces([]);
        if (onSpacesUpdate) onSpacesUpdate([]);
        return;
      }
      const token = localStorage.getItem("voxen_token");
      if (!token) {
        if (onSpacesUpdate) onSpacesUpdate([]);
        return;
      }

      // Load cached spaces first
      const cachedSpaces = getCachedSpaces();
      if (cachedSpaces.length > 0) {
        setUserSpaces(cachedSpaces);
        if (onSpacesUpdate) {
          onSpacesUpdate(toDisplayFormat(cachedSpaces));
        }
      }

      setLoadingSpaces(true);
      try {
        const response = await fetch(`${API_URL}/spaces/user/joined`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const freshSpaces = data.data || [];
          setUserSpaces(freshSpaces);
          cacheSpaces(freshSpaces);
          
          // Call callback with display format
          if (onSpacesUpdate) {
            const displaySpaces = toDisplayFormat(freshSpaces);
            onSpacesUpdate(displaySpaces);
          }
        } else {
          // Keep cached data if request fails
          const cachedSpaces = getCachedSpaces();
          if (cachedSpaces.length > 0) {
            setUserSpaces(cachedSpaces);
            if (onSpacesUpdate) onSpacesUpdate(toDisplayFormat(cachedSpaces));
          } else {
            if (onSpacesUpdate) onSpacesUpdate([]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch spaces:", error);
        // Keep cached data if request fails
        const cachedSpaces = getCachedSpaces();
        if (cachedSpaces.length > 0) {
          setUserSpaces(cachedSpaces);
          if (onSpacesUpdate) onSpacesUpdate(toDisplayFormat(cachedSpaces));
        } else {
          if (onSpacesUpdate) onSpacesUpdate([]);
        }
      } finally {
        setLoadingSpaces(false);
      }
    };
    fetchUserSpaces();
  }, [isConnected, refreshKey]);
  // Clear cache when disconnecting
  useEffect(() => {
    if (!isConnected) {
      try {
        localStorage.removeItem("voxen_user_spaces");
      } catch (error) {
        console.error("Failed to clear spaces cache:", error);
      }
    }
  }, [isConnected]);
  // Convert user spaces to display format
   const displaySpaces = userSpaces.map(s => ({
         id: s.slug,
         name: s.name,
         tooltip: s.name,
         image: s.logo || "",
       }));

  useEffect(() => {
    if (activeNavId !== undefined) setActiveNav(activeNavId);
  }, [activeNavId]);

  useEffect(() => {
    if (selectedSpaceId !== undefined) setSelectedSpace(selectedSpaceId);
  }, [selectedSpaceId]);

  const handleSelectOption = (type: "nav" | "space", id: string) => {
    if (type === "nav") {
      setActiveNav(id);
      setSelectedSpace("");
    } else {
      setSelectedSpace(id);
      setActiveNav("");
    }
    onSelectOption?.(type, id);
  };

  // Don't render responsive sidebars on server to prevent hydration mismatch
  if (!isClient) {
    return null;
  }

  return (
    <>
      {/* Sidebar - Mobile only, hidden on md+ screens */}
      {displaySpaces.length > 0 && (
        <nav className="md:hidden w-15 bg-white dark:bg-dark-bg-secondary flex flex-col items-center py-3 gap-2 border-r border-base-border dark:border-dark-border shrink-0 z-20 overflow-y-auto scrollbar-hide">
            {/* Voxen favicon (static, not selectable) */}
            <div className="w-full flex items-center justify-center py-2">
              <img src="/favicon.ico" alt="Voxen" className="w-8 h-8 rounded-md object-contain" />
            </div>
          {displaySpaces.map((space) => (
            <button
              key={space.id}
              onClick={() => handleSelectOption("space", space.id)}
              className="group relative flex items-center justify-center w-full"
            >
              {selectedSpace === space.id && (
                <div className="absolute left-0 w-1 h-8 bg-primary rounded-r-full transition-all duration-200" />
              )}
              {space.image ? (
                <div
                  className={`size-10 rounded-2xl bg-cover bg-center transition-all duration-200 ${
                    selectedSpace === space.id
                      ? "rounded-xl ring-2 ring-primary"
                      : "hover:rounded-xl"
                  }`}
                  style={{ backgroundImage: `url('${space.image}')` }}
                />
              ) : (
                <div
                  className={`size-10 rounded-2xl bg-linear-to-br from-primary to-blue-400 transition-all duration-200 flex items-center justify-center text-white font-bold text-sm ${
                    selectedSpace === space.id
                      ? "rounded-xl ring-2 ring-primary"
                      : "hover:rounded-xl"
                  }`}
                >
                  {space.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          ))}
          {/* Add Space Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowAddModal(true);
            }}
            className="mt-1 size-10 rounded-2xl bg-transparent border border-dashed border-base-text-secondary/40 dark:border-dark-text-secondary/40 text-base-text-secondary dark:text-dark-text-secondary hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 flex items-center justify-center hover:rounded-xl"
          >
            <AddOutline width="18px" height="18px" color="currentColor" />
          </button>
        </nav>
      )}

      {/* Desktop/Tablet Sidebar - hidden on mobile */}
      <nav className="hidden md:flex w-18 bg-white dark:bg-dark-bg-secondary flex-col items-center py-3 gap-3 border-r border-base-border dark:border-dark-border shrink-0 z-20 overflow-y-auto scrollbar-hide">
        {/* Voxen favicon (static, not selectable) */}
        <div className="w-full flex items-center justify-center py-2">
          <img src="/favicon.ico" alt="Voxen" className="w-10 h-10 rounded-md object-contain" />
        </div>
        {/* Hide nav buttons on mobile, show on md+ */}
        <div className="hidden md:flex flex-col items-center gap-3 w-full">
          {navItems.map((item) => (
            <NavIcon
              key={item.id}
              icon={item.icon}
              tooltip={item.tooltip}
              active={activeNav === item.id}
              onClick={() => handleSelectOption("nav", item.id)}
            />
          ))}
          <div className="w-8 h-0.5 bg-base-border dark:bg-dark-border rounded-full mx-auto my-1" />
        </div>
        {/* Spaces always visible */}
        {displaySpaces.map((space) => (
          <NavIcon
            key={space.id}
            tooltip={space.tooltip}
            image={space.image || undefined}
            selected={selectedSpace === space.id}
            onClick={() => handleSelectOption("space", space.id)}
            isSpace={true}
          />
        ))}
        <div className="relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowAddModal(true);
            }}
            className="mt-2 size-12 rounded-3xl bg-transparent border border-dashed border-base-text-secondary/40 dark:border-dark-text-secondary/40 text-base-text-secondary dark:text-dark-text-secondary hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200 group flex items-center justify-center hover:rounded-2xl"
          >
            <AddOutline width="20px" height="20px" color="currentColor" />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Home, Explore, Create, Profile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-bg-secondary border-t border-base-border dark:border-dark-border z-50 px-4 pb-safe">
        <div className="flex items-center justify-around py-2">
          {/* Home */}
          <button
            onClick={() => handleSelectOption("nav", "home")}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors ${
              activeNav === "home"
                ? "text-primary"
                : "text-base-text-secondary dark:text-dark-text-secondary"
            }`}
          >
            <HomeOutline width="24px" height="24px" color="currentColor" />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          {/* Explore */}
          <button
            onClick={() => handleSelectOption("nav", "explore")}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors ${
              activeNav === "explore"
                ? "text-primary"
                : "text-base-text-secondary dark:text-dark-text-secondary"
            }`}
          >
            <CompassOutline width="24px" height="24px" color="currentColor" />
            <span className="text-[10px] font-medium">Explore</span>
          </button>

          {/* Create/Add */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors text-base-text-secondary dark:text-dark-text-secondary"
          >
            <AddOutline width="24px" height="24px" color="currentColor" />
            <span className="text-[10px] font-medium">Create</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => handleSelectOption("nav", "profile")}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors ${
              activeNav === "profile"
                ? "text-primary"
                : "text-base-text-secondary dark:text-dark-text-secondary"
            }`}
          >
            <PersonOutline width="24px" height="24px" color="currentColor" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>

      {/* Modal - shared between mobile and desktop */}
      <AddSpaceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreateSpace={onCreateSpace}
        onJoinSpace={onJoinSpace}
      />
    </>
  );
}
