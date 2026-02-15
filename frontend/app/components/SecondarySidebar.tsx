"use client";
import { useEffect, useState, useRef } from "react";
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";
import { Avatar, Name } from "@coinbase/onchainkit/identity";
import { useAccount } from "wagmi";
import { HomeOutline, FlashOutline, NotificationsOutline, ClipboardOutline, ChatbubblesOutline, WalletOutline, ChevronDownOutline, AddOutline, PersonOutline, SettingsOutline, LogOutOutline, LinkOutline } from "react-ionicons";
// Helper to copy text to clipboard
function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
import { JSX } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface UserSpace {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  user_role: string;
}

function SidebarLink({ icon, label, badge, active, onClick }: { icon: string; label: string; badge?: number; active?: boolean; onClick?: () => void }) {
  const iconMap: Record<string, JSX.Element> = {
    home: <HomeOutline width="20px" height="20px" color="currentColor" />,
    activity: <FlashOutline width="20px" height="20px" color="currentColor" />,
    bell: <NotificationsOutline width="20px" height="20px" color="currentColor" />,
    person: <PersonOutline width="20px" height="20px" color="currentColor" />,
    settings: <SettingsOutline width="20px" height="20px" color="currentColor" />,
    logout: <LogOutOutline width="20px" height="20px" color="currentColor" />,
  };

  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-3 py-2 rounded-lg w-full group transition-colors ${active ? "bg-primary/5 dark:bg-primary/10 text-primary border border-primary/10 dark:border-primary/20" : "text-base-text dark:text-dark-text hover:bg-base-bg-secondary dark:hover:bg-dark-border/50"}`}>
      <span className={active ? "text-primary" : "text-base-text-secondary group-hover:text-primary"}>{iconMap[icon]}</span>
      <div className="flex-1 flex justify-between items-center">
        <span className={`text-sm ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
        {badge && (
          <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
    </button>
  );
}

function SpaceLink({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick?: () => void }) {
  const iconMap: Record<string, JSX.Element> = {
    vote: <ClipboardOutline width="20px" height="20px" color="currentColor" />,
    chat: <ChatbubblesOutline width="20px" height="20px" color="currentColor" />,
    wallet: <WalletOutline width="20px" height="20px" color="currentColor" />,
  };

  if (active) {
    return (
      <button onClick={onClick} className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 dark:bg-primary/10 text-primary group transition-colors border border-primary/10 dark:border-primary/20 w-full">
        <div className="flex items-center gap-3">
          {iconMap[icon]}
          <span className="text-sm font-semibold">{label}</span>
        </div>
      </button>
    );
  }

  return (
    <button onClick={onClick} className="flex items-center gap-3 px-3 py-2 rounded-lg text-base-text-secondary dark:text-dark-text-secondary hover:bg-base-bg-secondary dark:hover:bg-dark-border/50 hover:text-base-text dark:hover:text-dark-text group transition-colors w-full">
      {iconMap[icon]}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

interface Space {
  id: string;
  name: string;
  tooltip: string;
  image: string;
}

interface SecondarySidebarProps {
  visible?: boolean;
  space?: Space;
  activeView?: string;
  onNavigate?: (view: string) => void;
  isHomeView?: boolean;
  onToggle?: () => void;
  isMobileOpen?: boolean;
  refreshKey?: number;
  userSpaces?: any[];
  onSpaceDeleted?: () => void;
}

export default function SecondarySidebar({ visible = true, space, activeView = "proposals", onNavigate, isHomeView = false, onToggle, isMobileOpen = false, refreshKey = 0, userSpaces = [], onSpaceDeleted }: SecondarySidebarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [joinStatus, setJoinStatus] = useState<string | null>(null);
  const [detailedSpace, setDetailedSpace] = useState<any | null>(null);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (showMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);
  const { address, isConnected } = useAccount();
  const [mySpaces, setMySpaces] = useState<UserSpace[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const lastRefreshKeyRef = useRef<number>(-1);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);

  // Use userSpaces if provided, otherwise fetch independently
  const displaySpaces = userSpaces.length > 0 ? userSpaces : mySpaces;
  const isLoading = userSpaces.length === 0 && loadingSpaces;

  // Only fetch if userSpaces is not provided (backward compatibility)
  useEffect(() => {
    // If userSpaces is provided via props, skip independent fetching
    if (userSpaces.length > 0) {
      return;
    }

    const fetchMySpaces = async () => {
      if (!isConnected) {
        setMySpaces([]);
        return;
      }

      const token = localStorage.getItem("voxen_token");
      if (!token) return;

      // Skip if already fetched with same refreshKey
      if (lastRefreshKeyRef.current === refreshKey) return;
      lastRefreshKeyRef.current = refreshKey;

      // Cancel previous request if still pending
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }

      fetchAbortControllerRef.current = new AbortController();
      setLoadingSpaces(true);

      try {
        const response = await fetch(`${API_URL}/spaces/user/joined`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          signal: fetchAbortControllerRef.current.signal,
        });

        if (response.ok) {
          const data = await response.json();
          // Only keep spaces where the current user is the owner
          const ownerSpaces = (data.data || []).filter((s: UserSpace) => s.user_role === 'owner');
          setMySpaces(ownerSpaces);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Failed to fetch spaces:", error);
        }
      } finally {
        setLoadingSpaces(false);
      }
    };

    fetchMySpaces();

    return () => {
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
    };
  }, [isConnected, refreshKey, userSpaces.length]);

  // Fetch full space details (id, username, invite_token, user_role)
  const detailsAbortControllerRef = useRef<AbortController | null>(null);
  const lastSpaceIdRef = useRef<string>('');

  useEffect(() => {
    const fetchSpaceDetails = async () => {
      if (!space) {
        setDetailedSpace(null);
        setMemberRole(null);
        return;
      }

      const slug = (space as any).slug || (space as any).id;
      if (!slug) return;

      // Skip if already fetched this space
      if (lastSpaceIdRef.current === slug) return;
      lastSpaceIdRef.current = slug;

      // Set member role from cached space data immediately (for owner menu to show instantly)
      if ((space as any).user_role) {
        setMemberRole((space as any).user_role);
      }

      // Cancel previous request if still pending
      if (detailsAbortControllerRef.current) {
        detailsAbortControllerRef.current.abort();
      }

      detailsAbortControllerRef.current = new AbortController();

      try {
        const token = localStorage.getItem('voxen_token');
        const res = await fetch(`${API_URL}/spaces/${slug}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: detailsAbortControllerRef.current.signal,
        });
        if (res.ok) {
          const json = await res.json();
          setDetailedSpace(json.data || null);
          setMemberRole(json.data?.user_role || null);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Failed to fetch space details:', e);
        }
      }
    };

    fetchSpaceDetails();

    return () => {
      if (detailsAbortControllerRef.current) {
        detailsAbortControllerRef.current.abort();
      }
    };
  }, [space, refreshKey]);

  const handleNavigate = (view: string) => {
    onNavigate?.(view);
    // Close mobile drawer after navigation
    if (window.innerWidth < 768) {
      onToggle?.();
    }
  };

  // Home view sidebar content
  if (isHomeView) {
    // Format address for display
    const shortenedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

    return (
      <>
        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-30"
            onClick={onToggle}
          />
        )}

        {/* Sidebar - slide in on mobile */}
        <aside className={`
          w-70 bg-white dark:bg-dark-bg-secondary flex flex-col border-r border-base-border dark:border-dark-border shrink-0 z-40
          fixed md:relative inset-y-0 left-0
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${visible ? 'md:translate-x-0 md:opacity-100' : 'md:-translate-x-full md:opacity-0 md:absolute'}
          pb-16 md:pb-0
        `}>
          {/* Profile Header */}
          <div className="p-5 border-b border-base-border dark:border-dark-border">
            {isConnected && address ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar address={address} className="size-12 rounded-full ring-2 ring-primary/20" />
                  <div className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-green-500 border-2 border-white dark:border-dark-bg-secondary rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <Name address={address} className="text-base font-bold text-base-text dark:text-dark-text truncate">
                    <span>Unknown</span>
                  </Name>
                  <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary truncate">{shortenedAddress}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-base-bg-secondary dark:bg-dark-border flex items-center justify-center">
                  <PersonOutline width="24px" height="24px" color="currentColor" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-base-text-secondary dark:text-dark-text-secondary">Not Connected</p>
                  <p className="text-xs text-base-text-secondary/60 dark:text-dark-text-secondary/60">Connect wallet to view</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
            <div className="space-y-1">
              <SidebarLink icon="person" label="My Profile" active={activeView === "profile"} onClick={() => handleNavigate("profile")} />
              <SidebarLink icon="activity" label="Activity" active={activeView === "profile-activity"} onClick={() => handleNavigate("profile-activity")} />
              <SidebarLink icon="bell" label="Notifications" badge={3} active={activeView === "profile-notifications"} onClick={() => handleNavigate("profile-notifications")} />
              <SidebarLink icon="settings" label="Settings" active={activeView === "profile-settings"} onClick={() => handleNavigate("profile-settings")} />
            </div>

            <div className="border-t border-base-border dark:border-dark-border opacity-50" />

            {/* My Spaces Section */}
            <div className="space-y-2">
              <div className="px-3 pb-1 text-[11px] font-bold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center justify-between">
                <span>My Spaces</span>
                <button
                  onClick={() => handleNavigate("create-space")}
                  className="hover:text-primary"
                >
                  <AddOutline width="14px" height="14px" color="currentColor" />
                </button>
              </div>
              {isConnected ? (
                <div className="space-y-1">
                  {isLoading ? (
                    <div className="px-3 py-2">
                      <div className="animate-pulse flex items-center gap-3">
                        <div className="size-6 rounded-md bg-base-bg-secondary dark:bg-dark-border" />
                        <div className="h-4 w-24 bg-base-bg-secondary dark:bg-dark-border rounded" />
                      </div>
                    </div>
                  ) : displaySpaces.length > 0 ? (
                    displaySpaces.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleNavigate(`space:${s.id}`)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-base-text dark:text-dark-text hover:bg-base-bg-secondary dark:hover:bg-dark-border/50 transition-colors"
                      >
                        {s.image ? (
                          <img src={s.image} alt={s.name} className="size-6 rounded-md object-cover" />
                        ) : (
                          <div className="size-6 rounded-md bg-linear-to-br from-purple-500 to-pink-500" />
                        )}
                        <span className="text-sm font-medium truncate">{s.name}</span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 text-xs text-base-text-secondary dark:text-dark-text-secondary">
                      No spaces yet. Create one!
                    </p>
                  )}
                </div>
              ) : (
                <p className="px-3 text-xs text-base-text-secondary dark:text-dark-text-secondary">
                  Connect wallet to view your spaces
                </p>
              )}
            </div>
          </div>

          {/* Connect Wallet */}
          <div className="p-4 border-t border-base-border dark:border-dark-border">
            <Wallet>
              <ConnectWallet className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
                <WalletOutline width="20px" height="20px" color="currentColor" />
                <span>{isConnected ? "Wallet Connected" : "Connect Wallet"}</span>
              </ConnectWallet>
              <WalletDropdown>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
            {!isConnected && (
              <p className="text-center text-xs text-base-text-secondary dark:text-dark-text-secondary mt-2">
                Connect to vote on proposals
              </p>
            )}
          </div>
        </aside>
      </>
    );
  }

  // Space view sidebar content
  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={onToggle}
        />
      )}

      {/* Sidebar - slide in on mobile */}
      <aside className={`
        w-70 bg-white dark:bg-dark-bg-secondary flex flex-col border-r border-base-border dark:border-dark-border shrink-0 z-40
        fixed md:relative inset-y-0 left-0
        transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${visible ? 'md:translate-x-0 md:opacity-100' : 'md:-translate-x-full md:opacity-0 md:absolute'}
        pb-16 md:pb-0
      `}>
        {/* Header */}
        <div className="h-17 flex items-center justify-between px-5 border-b border-base-border dark:border-dark-border relative">
          <button
            onClick={() => handleNavigate("space-profile")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {space?.image ? (
              <div
                className="size-6 rounded-md bg-cover bg-center"
                style={{ backgroundImage: `url('${space.image}')` }}
              />
            ) : (
              <div className="size-6 bg-gradient-to-br from-primary to-blue-400 rounded-md" />
            )}
            <h1 className="text-base font-bold text-base-text dark:text-dark-text truncate">
              {space?.name || "Select a space"}
            </h1>
          </button>
          <button className="text-base-text-secondary hover:text-base-text dark:hover:text-dark-text transition-colors" onClick={() => setShowMenu((v) => !v)}>
            <ChevronDownOutline width="20px" height="20px" color="currentColor" />
          </button>
          {showMenu && space && (
            <div ref={menuRef} className="absolute right-0 top-14 z-50 w-56 sm:w-64 bg-white dark:bg-dark-bg-secondary rounded-xl shadow-2xl border border-base-border dark:border-dark-border overflow-hidden animate-fade-in max-w-[90vw]">
              {/* Menu Header */}
              <div className="px-4 py-3 border-b border-base-border dark:border-dark-border bg-base-bg-secondary dark:bg-dark-border/50">
                <p className="text-xs font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">Space Options</p>
              </div>

              {/* Menu Items */}
              <div className="py-2 px-2 space-y-1">
                {/* Copy Invite Link */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-base-bg-secondary dark:hover:bg-dark-border/50 transition-colors text-left text-base-text dark:text-dark-text group"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    setTimeout(() => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://voxen.xyz';
                      const inviteTarget = detailedSpace ? (detailedSpace.username || detailedSpace.invite_token) : ((space as any).username || (space as any).invite_token);
                      const inviteUrl = `${origin}/invite/${inviteTarget || ''}`;
                      copyToClipboard(inviteUrl);
                      setCopied(true);
                      showToast('Invite link copied to clipboard!', 'success');
                      setTimeout(() => setCopied(false), 1200);
                    }, 100);
                  }}
                >
                  <LinkOutline width="18px" height="18px" className="group-hover:text-primary transition-colors" color="currentColor" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Copy Invite Link</p>
                    <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">Share with others</p>
                  </div>
                  {copied && <span className="text-xs text-primary font-semibold">✓</span>}
                </button>

                {/* Update Space - Owner Only */}
                {memberRole === 'owner' && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleNavigate('space-profile');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-base-bg-secondary dark:hover:bg-dark-border/50 transition-colors text-left text-base-text dark:text-dark-text group"
                  >
                    <SettingsOutline width="18px" height="18px" className="group-hover:text-primary transition-colors" color="currentColor" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Update Space</p>
                      <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">Edit details & settings</p>
                    </div>
                  </button>
                )}

                {/* Delete Space - Owner Only */}
                {memberRole === 'owner' && (
                  <button
                    onClick={async () => {
                      if (!detailedSpace?.id) return;
                      if (!window.confirm('Are you sure you want to delete this space? This action cannot be undone.')) return;
                      setShowMenu(false);
                      const token = localStorage.getItem('voxen_token');
                      try {
                        const res = await fetch(`${API_URL}/spaces/${detailedSpace.id}`, {
                          method: 'DELETE',
                          headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
                        });
                        if (res.ok) {
                          // Remove from localStorage cache
                          try {
                            const cached = localStorage.getItem("voxen_user_spaces");
                            if (cached) {
                              const spaces = JSON.parse(cached);
                              const updatedSpaces = spaces.filter((s: any) => s.id !== detailedSpace.id);
                              localStorage.setItem("voxen_user_spaces", JSON.stringify(updatedSpaces));
                            }
                          } catch (cacheError) {
                            console.error("Failed to update cache:", cacheError);
                          }

                          showToast('Space deleted successfully!', 'success');

                          // Trigger refresh in parent to update spaces list instantly
                          onSpaceDeleted?.();

                          setTimeout(() => {
                            onNavigate?.("home");
                          }, 500);
                        } else {
                          const err = await res.json().catch(() => null);
                          showToast('Failed to delete space', 'error');
                          console.error('Delete failed', err);
                        }
                      } catch (e) {
                        showToast('Error deleting space', 'error');
                        console.error('Delete error', e);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left text-red-600 dark:text-red-400 group"
                  >
                    <svg width="18px" height="18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Delete Space</p>
                      <p className="text-xs text-red-500 dark:text-red-400">Permanently remove</p>
                    </div>
                  </button>
                )}

                {/* Leave Space - Non Owner */}
                {memberRole !== 'owner' && (
                  <button
                    onClick={async () => {
                      if (!detailedSpace?.id) return;
                      if (!window.confirm('Are you sure you want to leave this space?')) return;
                      setShowMenu(false);
                      const token = localStorage.getItem('voxen_token');
                      try {
                        const res = await fetch(`${API_URL}/spaces/${detailedSpace.id}/leave`, {
                          method: 'POST',
                          headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
                        });
                        if (res.ok) {
                          window.location.reload();
                        } else {
                          const err = await res.json().catch(() => null);
                          console.error('Leave failed', err);
                        }
                      } catch (e) {
                        console.error('Leave error', e);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left text-red-600 dark:text-red-400 group"
                  >
                    <LogOutOutline width="18px" height="18px" className="group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors" color="currentColor" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Leave Space</p>
                      <p className="text-xs text-red-500 dark:text-red-400">Exit this space</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          <div className="space-y-1">
            <SidebarLink icon="home" label="Overview" active={activeView === "overview"} onClick={() => handleNavigate("overview")} />
            <SidebarLink icon="activity" label="Activity" active={activeView === "activity"} onClick={() => handleNavigate("activity")} />

          </div>

          <div className="border-t border-base-border dark:border-dark-border opacity-50" />

          <div className="space-y-1">
            <div className="px-3 pb-2 text-[11px] font-bold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-widest flex items-center justify-between">
              <span>Spaces</span>
              <button
                onClick={() => handleNavigate("create-space")}
                className="hover:text-primary"
              >
                <AddOutline width="14px" height="14px" color="currentColor" />
              </button>
            </div>
            <SpaceLink icon="area-chart" label="Overview" active={activeView === "overview"} onClick={() => handleNavigate("overview")} />
            <SpaceLink icon="vote" label="Proposals" active={activeView === "proposals"} onClick={() => handleNavigate("proposals")} />
          </div>
        </div>
      </aside>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 left-4 right-4 sm:right-6 sm:left-auto px-4 py-3 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-300 flex items-center gap-2 ${toast.type === 'success'
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
          }`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </>
  );
}
