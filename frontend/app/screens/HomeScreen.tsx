"use client";
import { useState, useCallback } from "react";
import IconSidebar from "../components/IconSidebar";
import SecondarySidebar from "../components/SecondarySidebar";
import { Overview, Activity, Proposals, Home, NewProposal, SpaceProfile } from "../components/spaces";
import { MyProfile, ProfileActivity, ProfileNotifications, ProfileSettings, CreateSpace } from "../components/profile";
import { SearchOutline, AddOutline, MenuOutline } from "react-ionicons";
import { Avatar, Name } from "@coinbase/onchainkit/identity";
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from "@coinbase/onchainkit/wallet";

interface HomeScreenProps {
  onNavigate?: (screen: "home" | "explore") => void;
}




export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [showSecondarySidebar, setShowSecondarySidebar] = useState(true);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<any | null>(null);
  const [activeView, setActiveView] = useState("home");
  const [activeNavId, setActiveNavId] = useState("home");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [spacesRefreshKey, setSpacesRefreshKey] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch joined spaces from backend via IconSidebar (using a callback prop)
  const handleSpacesUpdate = (userSpaces: any[]) => {
    setSpaces(userSpaces);
    if (userSpaces.length > 0 && !selectedSpace) {
      setSelectedSpace(userSpaces[0]);
    }
  };

  // Function to refresh spaces in sidebar
  const refreshSpaces = useCallback(() => {
    setSpacesRefreshKey(prev => prev + 1);
  }, []);

  // Show temporary toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSidebarSelect = (type: "nav" | "space", id: string) => {
    if (type === "nav") {
      setActiveNavId(id);
      setSelectedSpaceId("");
      setIsMobileSidebarOpen(false); // Close mobile sidebar on nav change
      if (id === "explore") {
        onNavigate?.("explore");
      } else if (id === "home") {
        setShowSecondarySidebar(true);
        setActiveView(id);
      } else if (id === "profile") {
        setShowSecondarySidebar(true);
        setActiveView("profile");
      } else {
        setShowSecondarySidebar(false);
        setActiveView(id);
      }
    } else {
      setActiveNavId("");
      setSelectedSpaceId(id);
      setShowSecondarySidebar(true);
      setActiveView("overview");
      setIsMobileSidebarOpen(false); // Close mobile sidebar on space change
      const space = spaces.find((s) => s.id === id);
      if (space) {
        setSelectedSpace(space);
      }
    }
  };

  const handleViewNavigate = (view: string) => {
    setActiveView(view);
  };

  const handleExplore = () => {
    setActiveNavId("explore");
    setSelectedSpaceId("");
    onNavigate?.("explore");
  };

  const viewTitles: Record<string, string> = {
    home: "Home",
    overview: "Overview",
    activity: "Activity",
    proposals: "Proposals",
    "new-proposal": "New Proposal",
    "space-profile": "",
    profile: "My Profile",
    "profile-activity": "Activity",
    "profile-notifications": "Notifications",
    "profile-settings": "Settings",
    "create-space": "Create Space",
  };

  const renderContent = () => {
    switch (activeView) {
      case "home":
        return <Home joinedSpaces={spaces} onExplore={handleExplore} />;
      case "profile":
        return <MyProfile />;
      case "profile-activity":
        return <ProfileActivity />;
      case "profile-notifications":
        return <ProfileNotifications />;
      case "profile-settings":
        return <ProfileSettings onNavigate={handleViewNavigate} />;

      case "create-space":
        return <CreateSpace onBack={() => handleViewNavigate("home")} onCreateSpace={(data) => {
          refreshSpaces();
        }} />;
      case "overview":
        return <Overview spaceId={selectedSpace?.space_id} />;
      case "activity":
        return <Activity spaceId={selectedSpace?.space_id} onProposalClick={(proposalId) => {
          setActiveView("proposals");
          // The Proposals component will handle opening the specific proposal
          // Store proposalId in sessionStorage for now
          sessionStorage.setItem("openProposalId", proposalId);
        }} />;
      case "space-profile":
        return <SpaceProfile
          space={selectedSpace}
          onBack={() => handleViewNavigate("proposals")}
          onNavigate={handleViewNavigate}
        />;
      case "new-proposal":
        return <NewProposal
          spaceId={selectedSpace?.space_id}
          spaceName={selectedSpace?.name}
          onBack={() => handleViewNavigate("proposals")}
          onSubmit={(data) => {
            handleViewNavigate("proposals");
          }}
        />;
      case "proposals":
      default:
        return <Proposals
          spaceId={selectedSpace?.space_id}
          spaceSlug={selectedSpace?.id}
          spaceName={selectedSpace?.name}
          userRole={selectedSpace?.user_role}
        />;
    }
  };

  return (
    <div className="bg-base-bg-secondary dark:bg-dark-bg font-sans text-base-text dark:text-dark-text h-screen w-full overflow-hidden flex antialiased">
      <IconSidebar
        onSelectOption={handleSidebarSelect}
        activeNavId={activeNavId}
        selectedSpaceId={selectedSpaceId}
        onCreateSpace={() => {
          setActiveNavId("home");
          setSelectedSpaceId("");
          setShowSecondarySidebar(true);
          handleViewNavigate("create-space");
        }}
        onJoinSpace={(spaceOrInvite) => {
          if (spaceOrInvite && typeof spaceOrInvite === 'object') {
            showToast(`Joined ${spaceOrInvite.name}`);
            refreshSpaces();
            // set selected space to the joined one
            setSelectedSpace(spaceOrInvite);
          } else if (typeof spaceOrInvite === 'string') {
            showToast('Joined space');
            refreshSpaces();
          } else {
            showToast('Failed to join space');
          }
        }}
        refreshKey={spacesRefreshKey}
        // New: callback to get backend spaces
        onSpacesUpdate={handleSpacesUpdate}
      />
      <SecondarySidebar
        visible={showSecondarySidebar}
        space={selectedSpace}
        activeView={activeView}
        onNavigate={handleViewNavigate}
        isHomeView={["home", "profile", "profile-activity", "profile-notifications", "profile-settings", "create-space"].includes(activeView)}
        isMobileOpen={isMobileSidebarOpen}
        onToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        refreshKey={spacesRefreshKey}
        userSpaces={spaces}
        onSpaceDeleted={refreshSpaces}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-4 right-4 sm:right-6 sm:left-auto bg-black text-white px-4 py-2 rounded shadow-lg z-50">
          {toastMessage}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-base-bg-secondary dark:bg-dark-bg relative pb-16 md:pb-0">
        {/* Header */}
        <header className="h-14 md:h-17 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-dark-bg-secondary border-b border-base-border dark:border-dark-border shrink-0 sticky top-0 z-30">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 text-base-text-secondary hover:text-base-text dark:hover:text-dark-text transition-colors"
          >
            <MenuOutline width="24px" height="24px" color="currentColor" />
          </button>

          <h2 className="text-lg md:text-xl font-bold text-base-text dark:text-dark-text tracking-tight">{viewTitles[activeView] || "Proposals"}</h2>
          <div className="flex items-center gap-2 md:gap-4">
            {activeView === "proposals" && (
              <div className="relative hidden sm:block">
                <div className="absolute left-3 top-2 text-base-text-secondary">
                  <SearchOutline width="18px" height="18px" color="currentColor" />
                </div>
                <input
                  className="pl-9 pr-4 py-1.5 bg-base-bg-secondary dark:bg-dark-bg border border-transparent focus:bg-white dark:focus:bg-dark-bg-secondary focus:border-primary hover:border-base-border dark:hover:border-dark-border rounded-full text-sm text-base-text dark:text-dark-text focus:ring-0 w-48 md:w-64 placeholder:text-base-text-secondary/70 transition-all"
                  placeholder="Search proposals"
                  type="text"
                />
              </div>
            )}
            {activeView === "proposals" && (
              <button className="sm:hidden p-2 text-base-text-secondary hover:text-base-text dark:hover:text-dark-text transition-colors">
                <SearchOutline width="22px" height="22px" color="currentColor" />
              </button>
            )}
            {/* User Profile Button */}
            <div className="hidden md:block">
              <Wallet>
                <ConnectWallet className="bg-transparent! p-0!">
                  <Avatar className="h-8 w-8 rounded-full" />
                </ConnectWallet>
                <WalletDropdown>
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-medium text-gray-900 dark:text-white"><Name /></p>
                  </div>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
        </header>

        {/* Content Area */}
        {renderContent()}
      </main>
    </div>
  );
}
