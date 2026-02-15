"use client";
import { useState, useEffect } from "react";
import { CloseOutline, CheckmarkDoneOutline } from "react-ionicons";
import { profileApi } from "@/app/services/profileApi";

interface EditProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: { username: string; displayName: string; email: string; bio: string }) => void;
  currentUsername?: string;
  currentBio?: string;
}

export default function EditProfile({ isOpen, onClose, onSave, currentUsername = "", currentBio = "" }: EditProfileProps) {
  const [username, setUsername] = useState(currentUsername);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState(currentBio);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // When modal opens, load current profile
    const load = async () => {
      if (!isOpen) return;
      try {
        const profile = await profileApi.getCurrentProfile();
        setUsername(profile.username || currentUsername);
        setDisplayName(profile.name || "");
        setEmail(profile.email || "");
        setBio(profile.bio || currentBio);
        setEmailVerified(profile.email_otp_verified || false);
      } catch (err) {
        // ignore load error — keep props values
      }
    };

    load();
  }, [isOpen, currentUsername, currentBio]);

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      // Update profile (username, displayName, email, bio)
      await profileApi.updateProfile({
        username,
        name: displayName,
        email,
        bio,
      });

      onSave?.({ username, displayName, email, bio });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
      console.error("Profile update error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl border-t border-gray-200 dark:border-gray-700 z-50 overflow-y-auto max-h-[90vh] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[90vw] md:max-w-2xl md:rounded-2xl md:border md:max-h-[85vh]">
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-3 pb-2 md:hidden sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-8 py-5 md:py-6 border-b border-gray-200 dark:border-gray-700 sticky top-8 md:top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Update your profile information</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 -mr-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <CloseOutline width="24px" height="24px" color="currentColor" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 md:px-8 py-6 md:py-8">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}
          
          {/* Username & Display Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                disabled
                placeholder="johndoe"
                maxLength={30}
                className="w-full px-4 py-3.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-not-allowed opacity-60 transition-all text-sm md:text-base"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Read-only • Cannot be changed
              </p>
            </div>

            {/* Display Name Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                maxLength={50}
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all text-sm md:text-base"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Your public name</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{displayName.length}/50</p>
              </div>
            </div>
          </div>

          {/* Email Row */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2.5">
              Email Address
            </label>
            <div className="flex items-center gap-3">
              <input
                type="email"
                value={email}
                placeholder="john@example.com"
                disabled
                className="flex-1 px-4 py-3.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 cursor-not-allowed opacity-60 transition-all text-sm md:text-base"
              />
              {emailVerified && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg whitespace-nowrap">
                  <CheckmarkDoneOutline width="18" height="18" color="#16a34a" />
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400">Verified</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Read-only • Verified through OTP
            </p>
          </div>

          {/* Bio Row */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2.5">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself, your interests, and what you do..."
              maxLength={160}
              rows={5}
              className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all resize-none text-sm md:text-base leading-relaxed"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">A short bio about yourself</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{bio.length}/160</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 md:px-8 py-4 md:py-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 sticky bottom-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-colors text-sm md:text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base shadow-lg shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/40"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Safe area padding for mobile devices with notch/home indicator */}
        <div className="h-safe-area-inset-bottom md:hidden" />
      </div>
    </>
  );
}
