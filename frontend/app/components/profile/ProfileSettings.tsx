"use client";
import { useState, useEffect } from "react";
import { SettingsOutline, LogoTwitter, LogoDiscord, CheckmarkCircle } from "react-ionicons";
import { profileApi } from "@/app/services/profileApi";
import SocialOAuthModal from "./SocialOAuthModal";

interface SettingsProps {
  onNavigate?: (view: string) => void;
}

export default function ProfileSettings({ onNavigate }: SettingsProps) {
  const [socials, setSocials] = useState<Record<string, string>>({
    twitter: "",
    discord: "",
    telegram: "",
  });
  const [socialLinkedDates, setSocialLinkedDates] = useState<Record<string, string>>({});
  const [oauthModal, setOauthModal] = useState<"twitter" | "discord" | "telegram" | null>(null);
  const [twitterCooldown, setTwitterCooldown] = useState<{ cooldown: boolean; until: string | null }>({ cooldown: false, until: null });
  const [canDisconnectTwitter, setCanDisconnectTwitter] = useState(false);
  const [disconnectAvailableAt, setDisconnectAvailableAt] = useState<string | null>(null);
  const [disconnectTimer, setDisconnectTimer] = useState<string>("");
  const [isVerified, setIsVerified] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    email_on_proposal: true,
    email_on_vote: true,
    email_on_member_join: true,
    push_enabled: false,
  });
  const [savingLoading, setSavingLoading] = useState(false);

  // Load profile and settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const profile = await profileApi.getCurrentProfile();

        setSocials({
          twitter: profile.twitter_handle || "",
          discord: profile.discord_handle || "",
          telegram: profile.telegram_handle || "",
        });

        // Check Twitter cooldown status and disconnect availability
        try {
          const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/twitter/status`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('voxen_token')}` }
          });
          if (resp.ok) {
            const data = await resp.json();
            // Check if cooldown_until is in the response data (from previous disconnect)
            const cooldownUntil = data.data?.cooldown_until || data.cooldown_until;
            if (cooldownUntil) {
              setTwitterCooldown({ cooldown: true, until: cooldownUntil });
            } else {
              setTwitterCooldown({ cooldown: false, until: null });
            }
            // Check if can disconnect (15 days since connection)
            const twitterStatus = data.data || {};
            setCanDisconnectTwitter(twitterStatus.canDisconnect || false);
            setDisconnectAvailableAt(twitterStatus.disconnectAvailableAt || null);
          }
        } catch (err) {
          console.error("Failed to check Twitter status:", err);
        }

        // Store linked dates
        setSocialLinkedDates({
          twitter: profile.twitter_linked_at || "",
          discord: profile.discord_linked_at || "",
          telegram: profile.telegram_linked_at || "",
        });

        // Check if verified (all linked socials are 6+ months old)
        const kyc = await profileApi.getKYCStatus();
        setIsVerified(kyc?.eligibility?.eligible || false);

        const prefs = await profileApi.getNotificationPreferences();
        setNotificationPrefs({
          email_on_proposal: prefs.email_on_proposal || prefs.data?.email_on_proposal,
          email_on_vote: prefs.email_on_vote || prefs.data?.email_on_vote,
          email_on_member_join: prefs.email_on_member_join || prefs.data?.email_on_member_join,
          push_enabled: prefs.push_enabled || prefs.data?.push_enabled,
        });
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };

    loadSettings();
  }, []);

  // Countdown timer for disconnect availability
  useEffect(() => {
    if (!disconnectAvailableAt || canDisconnectTwitter) {
      setDisconnectTimer("");
      return;
    }

    const calculateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(disconnectAvailableAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setDisconnectTimer("");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let timerText = "";
      if (days > 0) timerText += `${days}d `;
      if (hours > 0 || days > 0) timerText += `${hours}h `;
      timerText += `${minutes}m ${seconds}s`;

      setDisconnectTimer(timerText);
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 1000);

    return () => clearInterval(interval);
  }, [disconnectAvailableAt, canDisconnectTwitter]);

  const handleOAuthSuccess = async (platform: string, handle: string) => {
    setSavingLoading(true);
    try {
      await profileApi.updateProfile({
        [platform === "twitter"
          ? "twitter_handle"
          : platform === "discord"
          ? "discord_handle"
          : "telegram_handle"]: handle,
      });

      // Update local state
      setSocials(prev => ({ ...prev, [platform]: handle }));

      // Update linked date to now
      setSocialLinkedDates(prev => ({ 
        ...prev, 
        [platform]: new Date().toISOString() 
      }));

      // Re-check verification status
      const kyc = await profileApi.getKYCStatus();
      setIsVerified(kyc?.eligibility?.eligible || false);
    } catch (err) {
      console.error("Failed to save social link:", err);
      alert("Failed to save social link");
    } finally {
      setSavingLoading(false);
    }
  };

  const handleDisconnect = async (platform: string) => {
    setSavingLoading(true);
    try {
      await profileApi.updateProfile({
        [platform === "twitter"
          ? "twitter_handle"
          : platform === "discord"
          ? "discord_handle"
          : "telegram_handle"]: "",
      });

      setSocials(prev => ({ ...prev, [platform]: "" }));
      setSocialLinkedDates(prev => ({ ...prev, [platform]: "" }));

      // Re-check verification status
      const kyc = await profileApi.getKYCStatus();
      setIsVerified(kyc?.eligibility?.eligible || false);
    } catch (err) {
      console.error("Failed to disconnect:", err);
      alert("Failed to disconnect");
    } finally {
      setSavingLoading(false);
    }
  };

  const handleNotificationPrefChange = async (key: string, value: boolean) => {
    try {
      const updated = { ...notificationPrefs, [key]: value };
      setNotificationPrefs(updated);
      await profileApi.updateNotificationPreferences(updated);
    } catch (err) {
      console.error("Failed to update notification preference:", err);
      setNotificationPrefs(prev => ({ ...prev, [key]: !value }));
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24 pb-20 md:pb-6">
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold text-base-text dark:text-dark-text mb-0.5 md:mb-1">Settings</h2>
          <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">Manage your account preferences</p>
        </div>

        <div className="max-w-2xl space-y-4 md:space-y-6">
          {/* Social Links Section */}
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border overflow-hidden">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-base-border dark:border-dark-border flex items-center justify-between">
              <h3 className="font-semibold text-sm md:text-base text-base-text dark:text-dark-text flex items-center gap-2">
                <LogoTwitter width="18px" height="18px" color="#1DA1F2" />
                Link Social Accounts
              </h3>
              {isVerified && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckmarkCircle width="14px" height="14px" color="#10b981" />
                  <span className="text-[10px] md:text-xs font-medium text-green-700 dark:text-green-400">Verified</span>
                </div>
              )}
            </div>
            <div className="p-4 md:p-6 space-y-3 md:space-y-4">
              <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
                Connect all social accounts to get verified. Accounts must be at least 6 months old.
              </p>

              {/* Twitter */}
              <div className="flex items-center justify-between p-3 md:p-4 bg-base-bg-secondary dark:bg-dark-border/50 rounded-lg md:rounded-xl gap-3">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center shrink-0">
                    <LogoTwitter width="16px" height="16px" color="#1DA1F2" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs md:text-sm text-base-text dark:text-dark-text">Twitter</p>
                    {socials.twitter ? (
                      <>
                        <p className="text-[10px] md:text-xs text-green-600 dark:text-green-400 truncate">✓ Connected</p>
                        {!canDisconnectTwitter && disconnectAvailableAt && (
                          <>
                            <p className="text-[10px] md:text-xs text-amber-600 dark:text-amber-400 mt-1">
                              Disconnect available in 15 days ({new Date(disconnectAvailableAt).toLocaleDateString()})
                            </p>
                            {disconnectTimer && (
                              <p className="text-[10px] md:text-xs text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                                ⏱️ {disconnectTimer} remaining
                              </p>
                            )}
                          </>
                        )}
                        {canDisconnectTwitter && (
                          <p className="text-[10px] md:text-xs text-red-500 mt-1">Disconnecting will prevent reconnecting this handle for 15 days.</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Not connected</p>
                        {twitterCooldown.cooldown && twitterCooldown.until && (
                          <p className="text-[10px] md:text-xs text-red-500 mt-1">This handle is in cooldown. You cannot reconnect until {new Date(twitterCooldown.until).toLocaleString()}.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => (socials.twitter && canDisconnectTwitter ? handleDisconnect("twitter") : setOauthModal("twitter"))}
                  disabled={savingLoading || (socials.twitter && !canDisconnectTwitter)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors shrink-0 disabled:opacity-50 ${
                    socials.twitter
                      ? canDisconnectTwitter
                        ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-200"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-900/20 dark:text-gray-500 cursor-not-allowed"
                      : "bg-[#1DA1F2] text-white hover:opacity-90"
                  }`}
                >
                  {socials.twitter ? "Disconnect" : "Connect"}
                </button>
              </div>

              {/* Discord */}
              <div className="flex items-center justify-between p-3 md:p-4 bg-base-bg-secondary dark:bg-dark-border/50 rounded-lg md:rounded-xl gap-3">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#5865F2]/10 flex items-center justify-center shrink-0">
                    <LogoDiscord width="16px" height="16px" color="#5865F2" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs md:text-sm text-base-text dark:text-dark-text">Discord</p>
                    <p className="text-[10px] md:text-xs text-blue-500 dark:text-blue-400 truncate">Coming Soon</p>
                  </div>
                </div>
                <button
                  disabled={true}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors shrink-0 disabled:opacity-50 bg-gray-100 text-gray-400 dark:bg-gray-900/20 dark:text-gray-500 cursor-not-allowed`}
                >
                  Connect
                </button>
              </div>

              {/* Telegram */}
              <div className="flex items-center justify-between p-3 md:p-4 bg-base-bg-secondary dark:bg-dark-border/50 rounded-lg md:rounded-xl gap-3">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#0088cc]/10 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" color="#0088cc" className="text-[#0088cc]">
                      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0m5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.328-.375-.115l-6.869 4.332-2.96-.924c-.64-.2-.658-.64.135-.954l11.566-4.461c.54-.203 1.01.132.84.951z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-xs md:text-sm text-base-text dark:text-dark-text">Telegram</p>
                    <p className="text-[10px] md:text-xs text-blue-500 dark:text-blue-400 truncate">Coming Soon</p>
                  </div>
                </div>
                <button
                  disabled={true}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors shrink-0 disabled:opacity-50 bg-gray-100 text-gray-400 dark:bg-gray-900/20 dark:text-gray-500 cursor-not-allowed`}
                >
                  Connect
                </button>
              </div>
            </div>
          </div>

          {/* General Settings */}
          <div className="bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border overflow-hidden">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-base-border dark:border-dark-border">
              <h3 className="font-semibold text-sm md:text-base text-base-text dark:text-dark-text flex items-center gap-2">
                <SettingsOutline width="18px" height="18px" color="currentColor" />
                General
              </h3>
            </div>
            <div className="divide-y divide-base-border dark:divide-dark-border">
              <div className="flex items-center justify-between p-3 md:p-4 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs md:text-sm text-base-text dark:text-dark-text">Email on Proposal</p>
                  <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Get notified about new proposals</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={notificationPrefs.email_on_proposal}
                    onChange={(e) => handleNotificationPrefChange('email_on_proposal', e.target.checked)}
                  disabled={savingLoading}
                  />
                  <div className="w-9 md:w-11 h-5 md:h-6 bg-base-border dark:bg-dark-border rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 md:after:h-5 after:w-4 md:after:w-5 after:transition-all"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 md:p-4 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs md:text-sm text-base-text dark:text-dark-text">Email on Vote</p>
                  <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Receive updates on your votes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={notificationPrefs.email_on_vote}
                    onChange={(e) => handleNotificationPrefChange('email_on_vote', e.target.checked)}
                  />
                  <div className="w-9 md:w-11 h-5 md:h-6 bg-base-border dark:bg-dark-border rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 md:after:h-5 after:w-4 md:after:w-5 after:transition-all"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 md:p-4 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs md:text-sm text-base-text dark:text-dark-text">Email on Member Join</p>
                  <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Get notified when members join</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={notificationPrefs.email_on_member_join}
                    onChange={(e) => handleNotificationPrefChange('email_on_member_join', e.target.checked)}
                  />
                  <div className="w-9 md:w-11 h-5 md:h-6 bg-base-border dark:bg-dark-border rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 md:after:h-5 after:w-4 md:after:w-5 after:transition-all"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 md:p-4 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs md:text-sm text-base-text dark:text-dark-text">Push Notifications</p>
                  <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">Get notified on your device</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={notificationPrefs.push_enabled}
                    onChange={(e) => handleNotificationPrefChange('push_enabled', e.target.checked)}
                  />
                  <div className="w-9 md:w-11 h-5 md:h-6 bg-base-border dark:bg-dark-border rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 md:after:h-5 after:w-4 md:after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OAuth Modal */}
      <SocialOAuthModal
        isOpen={oauthModal !== null}
        platform={oauthModal}
        onClose={() => setOauthModal(null)}
        onSuccess={(handle) => {
          if (oauthModal) handleOAuthSuccess(oauthModal, handle);
        }}
      />
    </>
  );
}
