"use client";
import { useState } from "react";
import { CloseOutline } from "react-ionicons";

interface SocialOAuthModalProps {
  isOpen: boolean;
  platform: "twitter" | "discord" | "telegram" | null;
  onClose: () => void;
  onSuccess: (handle: string) => void;
}

export default function SocialOAuthModal({ isOpen, platform, onClose, onSuccess }: SocialOAuthModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !platform) return null;

  const platformConfig = {
    twitter: {
      name: "Twitter",
      color: "#1DA1F2",
      placeholder: "twitter_username",
      icon: "𝕏",
    },
    discord: {
      name: "Discord",
      color: "#5865F2",
      placeholder: "user#1234",
      icon: "📱",
    },
    telegram: {
      name: "Telegram",
      color: "#0088cc",
      placeholder: "telegram_username",
      icon: "✈️",
    },
  };

  const config = platformConfig[platform];

  const handleConnect = async () => {
    setLoading(true);
    try {
      // Get the auth token from localStorage
      const token = localStorage.getItem("voxen_token");
      
      if (!token) {
        throw new Error("You must be logged in to connect social accounts");
      }

      // Get authorization URL from backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/twitter`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get Twitter authorization URL');
      }
      
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Redirect to Twitter OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.message || 'Invalid response from backend');
      }
    } catch (error) {
      console.error('Twitter OAuth error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 w-full bg-white dark:bg-dark-bg-secondary rounded-t-2xl shadow-2xl border-t border-base-border dark:border-dark-border z-50 overflow-hidden md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-2xl md:border">
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-3 pb-2 md:hidden">
          <div className="w-10 h-1 bg-base-border dark:bg-dark-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-base-border dark:border-dark-border">
          <h2 className="text-lg md:text-xl font-bold text-base-text dark:text-dark-text">
            Connect {config.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-base-text-secondary hover:text-base-text dark:hover:text-dark-text transition-colors"
          >
            <CloseOutline width="24px" height="24px" color="currentColor" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6">
          {/* Simulated OAuth Flow */}
          <div className="space-y-4">
            <div className="text-center py-8">
              <div
                className="inline-block text-6xl mb-4 animate-bounce"
                style={{ animationDuration: "1s" }}
              >
                {config.icon}
              </div>
              <p className="text-sm md:text-base text-base-text dark:text-dark-text font-semibold">
                Connecting to {config.name}
              </p>
              <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary mt-2">
                You'll be authenticated with your {config.name} account
              </p>
            </div>

            {/* OAuth flow info */}
            <div className="bg-base-bg-secondary dark:bg-dark-border/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-lg">1️⃣</span>
                <div>
                  <p className="text-xs md:text-sm font-medium text-base-text dark:text-dark-text">
                    Authenticate
                  </p>
                  <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">
                    You'll authorize Voxen to access your {config.name} account
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">2️⃣</span>
                <div>
                  <p className="text-xs md:text-sm font-medium text-base-text dark:text-dark-text">
                    Verify Identity
                  </p>
                  <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">
                    Your {config.name} handle will be linked to your profile
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">3️⃣</span>
                <div>
                  <p className="text-xs md:text-sm font-medium text-base-text dark:text-dark-text">
                    Verify Your {config.name}
                  </p>
                  <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">
                    6 months of {config.name} history required for KYC
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 md:p-6 border-t border-base-border dark:border-dark-border">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg border border-base-border dark:border-dark-border text-base-text dark:text-dark-text hover:bg-base-bg-secondary dark:hover:bg-dark-border/50 font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={loading}
            style={{ backgroundColor: config.color }}
            className="flex-1 px-4 py-3 rounded-lg text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            {loading ? "Connecting..." : `Connect ${config.name}`}
          </button>
        </div>

        {/* Safe area padding for mobile */}
        <div className="h-safe-area-inset-bottom md:hidden" />
      </div>
    </>
  );
}
