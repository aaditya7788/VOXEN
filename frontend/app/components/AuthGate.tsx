"use client";
import React, { useState, useEffect, useRef } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useAuth } from "../contexts/AuthContext";
import { useWallet } from "../contexts/WalletContext";
import { Wallet, ConnectWallet } from "@coinbase/onchainkit/wallet";
import { Avatar, Name } from "@coinbase/onchainkit/identity";
import { base } from "wagmi/chains";
import {
  ShieldCheckmarkOutline,
  PersonOutline,
  MailOutline,
  AtOutline,
  CheckmarkDoneOutline,
} from "react-ionicons";
import { profileApi } from "@/app/services/profileApi";

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { user, isAuthenticated, isLoading, error, signIn } = useAuth();
  const { switchNetwork } = useWallet();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<"verify" | "profile">("verify");
  const [wasConnected, setWasConnected] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Profile form state - using refs to prevent re-renders
  const usernameRef = useRef<HTMLInputElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Profile and email verification state
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const isOnBase = chainId === base.id;

  // Detect wallet connection and show onboarding
  // Detect wallet connection and show onboarding
  useEffect(() => {
    if (isConnected && !wasConnected && !isAuthenticated) {
      setShowOnboarding(true);
      setOnboardingStep("verify");
    }
    if (!isConnected) {
      setShowOnboarding(false);
      setOnboardingStep("verify");
    }
    setWasConnected(isConnected);
  }, [isConnected, wasConnected, isAuthenticated]);

  // Fetch profile data when profile modal opens
  useEffect(() => {
    if (onboardingStep === "profile" && !profileData && !isLoadingProfile) {
      const fetchProfile = async () => {
        setIsLoadingProfile(true);
        try {
          const data = await profileApi.getCurrentProfile();
          setProfileData(data);

          // Populate form with existing data
          if (data.username && usernameRef.current) {
            usernameRef.current.value = data.username;
          }
          if (data.name && displayNameRef.current) {
            displayNameRef.current.value = data.name;
          }
          if (data.email && emailRef.current) {
            emailRef.current.value = data.email;
            setEmail(data.email);
          }

          // Check email verification status
          if (data.email_otp_verified) {
            setOtpVerified(true);
            setEmailVerified(true);
          } else if (data.email_verified_at) {
            setEmailVerified(true);
          }

          // If profile is complete (username AND name AND email all exist), close modal
          if (data.username && data.name && data.email) {
            setShowOnboarding(false);
          }
        } catch (err) {
          console.log("Profile not yet created or error fetching:", err);
          // This is expected for new users
        } finally {
          setIsLoadingProfile(false);
        }
      };

      fetchProfile();
    }
  }, [onboardingStep, profileData, isLoadingProfile]);

  // Handle sign in
  const handleSignIn = async () => {
    setSigningIn(true);
    setLocalError(null);

    try {
      const success = await signIn();
      if (success) {
        setOnboardingStep("profile");
      }
    } catch (err: any) {
      setLocalError(err.message || "Sign in failed");
    } finally {
      setSigningIn(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setShowOnboarding(false);
    disconnect();
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    const username = usernameRef.current?.value || "";
    const name = displayNameRef.current?.value || "";

    if (!username.trim()) {
      errors.username = "Username is required";
    } else if (username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.username = "Username can only contain letters, numbers, and underscores";
    }

    if (!name.trim()) {
      errors.name = "Display name is required";
    }

    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email format";
    }

    if (email && !otpVerified) {
      errors.email = "Please verify your email with OTP first";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle send OTP
  const handleSendOTP = async () => {
    if (!email) {
      setOtpError("Please enter an email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setOtpError("Invalid email format");
      return;
    }

    setSendingOtp(true);
    setOtpError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const token = localStorage.getItem("voxen_token");

      const response = await fetch(`${API_URL}/auth/email/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        setOtpError(data.message || "Failed to send OTP");
        return;
      }

      setOtpSent(true);
      setOtpError(null);
      setResendCooldown(60); // 60 second cooldown

      // Start countdown
      const countdown = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setOtpError(err.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  // Handle verify OTP
  const handleVerifyOTP = async () => {
    const otp = otpRef.current?.value;
    if (!otp) {
      setOtpError("Please enter the OTP");
      return;
    }

    if (otp.length !== 6) {
      setOtpError("OTP must be 6 digits");
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const token = localStorage.getItem("voxen_token");

      const response = await fetch(`${API_URL}/auth/email/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ otp }),
      });

      if (!response.ok) {
        const data = await response.json();
        setOtpError(data.message || "Invalid OTP");
        return;
      }

      setOtpVerified(true);
      setEmailVerified(true);
      setOtpSent(false);
      if (otpRef.current) {
        otpRef.current.value = "";
      }
    } catch (err: any) {
      setOtpError(err.message || "Failed to verify OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Handle email verification request (old method - kept for backward compatibility)
  const handleEmailVerification = async () => {
    const email = emailRef.current?.value;
    if (!email) {
      setLocalError("Please enter an email address");
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const token = localStorage.getItem("voxen_token");

      const response = await fetch(`${API_URL}/auth/request-email-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        setLocalError(data.message || "Failed to send verification email");
        return;
      }

      setLocalError(null);
    } catch (err: any) {
      setLocalError(err.message || "Failed to send verification email");
    }
  };

  // Handle profile submit
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSigningIn(true);
    setLocalError(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const token = localStorage.getItem("voxen_token");

      const profileData: Record<string, string> = {};
      if (usernameRef.current?.value) profileData.username = usernameRef.current.value.toLowerCase();
      if (displayNameRef.current?.value) profileData.name = displayNameRef.current.value;
      if (email) profileData.email = email;

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message?.includes("username")) {
          setFormErrors({ username: "Username already taken" });
        } else {
          setLocalError(data.message || "Failed to update profile");
        }
        return;
      }

      // Update local storage with new user data
      const savedUser = localStorage.getItem("voxen_user");
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        localStorage.setItem("voxen_user", JSON.stringify({ ...userData, ...data.data }));
      }

      setShowOnboarding(false);
      window.location.reload();
    } catch (err: any) {
      setLocalError(err.message || "Failed to save profile");
    } finally {
      setSigningIn(false);
    }
  };

  // Skip profile for now
  const handleSkipProfile = () => {
    setShowOnboarding(false);
  };

  // Determine what content to show
  const renderMainContent = () => {
    if (!isConnected) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 max-w-md w-full text-center shadow-xl">
            <img
              src="/icon.png"
              alt="Voxen"
              className="w-20 h-20 mx-auto mb-6 rounded-2xl shadow-lg"
            />

            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to Voxen
            </h1>
            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mb-6">
              Decentralized governance for the Base ecosystem. Connect your wallet to get started.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Vote on proposals in your favorite DAOs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Join communities and create spaces</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Secure signature-based authentication</span>
              </div>
            </div>

            <Wallet>
              <ConnectWallet className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center">
                <Avatar className="h-5 w-5" />
                <Name />
              </ConnectWallet>
            </Wallet>

            <p className="text-xs text-gray-400 mt-4">
              By connecting, you agree to our Terms of Service
            </p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 max-w-md w-full text-center shadow-xl">
            <div className="w-12 h-12 mx-auto mb-5 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Complete Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please complete the verification process
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  };

  return (
    <>
      {renderMainContent()}

      {/* Modal rendered at root level to prevent focus issues */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCancel}
          />

          <div className="relative bg-white dark:bg-gray-900 rounded-2xl p-6 w-[90%] max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            {onboardingStep === "verify" ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheckmarkOutline width="32" height="32" color="#3b82f6" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Verify Your Wallet
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                    Sign a message to prove you own this wallet.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Connected Wallet</p>
                  <p className="font-mono text-sm text-gray-900 dark:text-white truncate">
                    {address}
                  </p>
                </div>

                {/* Network Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Select Network
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        switchNetwork(true); // Base Sepolia
                      }}
                      className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${chainId === 84532
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                        }`}
                    >
                      <div
                        className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${chainId === 84532
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                          }`}
                      >
                        {chainId === 84532 && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                          Base Sepolia Testnet
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          For testing and development
                        </p>
                      </div>
                      {chainId === 84532 && (
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">
                          Connected
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        switchNetwork(false); // Base Mainnet
                      }}
                      className={`w-full p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${chainId === 8453
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                        }`}
                    >
                      <div
                        className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${chainId === 8453
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-300 dark:border-gray-600"
                          }`}
                      >
                        {chainId === 8453 && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                          Base Mainnet
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Production network
                        </p>
                      </div>
                      {chainId === 8453 && (
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">
                          Connected
                        </span>
                      )}
                    </button>

                    {chainId && chainId !== 84532 && chainId !== 8453 && (
                      <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <p className="text-xs text-orange-600 dark:text-orange-400 text-center">
                          Please select a Base network to continue
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {(error || localError) && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-4">
                    <p className="text-red-600 dark:text-red-400 text-sm text-center">{error || localError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    disabled={signingIn || isLoading}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSignIn}
                    disabled={signingIn || isLoading || (chainId !== 84532 && chainId !== 8453)}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {signingIn || isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Signing...</span>
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Header matching EditProfile style */}
                <div className="flex items-center justify-between px-4 md:px-6 py-4 md:py-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                    Edit Profile
                  </h2>
                  <button
                    onClick={handleCancel}
                    className="p-2 -mr-2 text-gray-600 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <form onSubmit={handleProfileSubmit} className="p-4 md:p-6 space-y-4 md:space-y-5">
                  {/* Error Message */}
                  {(localError || otpError) && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{localError || otpError}</p>
                    </div>
                  )}

                  {/* Username Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={usernameRef}
                      type="text"
                      placeholder="johndoe"
                      autoComplete="off"
                      autoFocus
                      className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all ${formErrors.username ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                        }`}
                    />
                    {formErrors.username && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
                    )}
                  </div>

                  {/* Display Name Field */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={displayNameRef}
                      type="text"
                      placeholder="John Doe"
                      autoComplete="off"
                      className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all ${formErrors.name ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                        }`}
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Email Field with OTP */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      <input
                        ref={emailRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        autoComplete="off"
                        disabled={otpSent && !otpVerified}
                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all disabled:opacity-50 ${formErrors.email ? "border-red-500" : "border-gray-200 dark:border-gray-700"
                          }`}
                      />

                      {otpVerified ? (
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-200 dark:border-green-800">
                          <CheckmarkDoneOutline width="14" height="14" color="currentColor" />
                          <span>Email verified</span>
                        </div>
                      ) : otpSent ? (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Enter OTP (6 digits)
                            </label>
                            <input
                              ref={otpRef}
                              type="text"
                              placeholder="000000"
                              maxLength={6}
                              inputMode="numeric"
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center text-2xl tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleVerifyOTP}
                              disabled={verifyingOtp || !otpRef.current?.value}
                              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                            >
                              {verifyingOtp ? (
                                <>
                                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Verifying...
                                </>
                              ) : (
                                "Verify"
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={handleSendOTP}
                              disabled={sendingOtp || resendCooldown > 0}
                              className="flex-1 px-4 py-2 border border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend"}
                            </button>
                          </div>
                        </>
                      ) : email && !sendingOtp ? (
                        <button
                          type="button"
                          onClick={handleSendOTP}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                        >
                          Send OTP
                        </button>
                      ) : sendingOtp ? (
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
                          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending OTP...
                        </div>
                      ) : null}

                      {formErrors.email && (
                        <p className="text-red-500 text-xs">{formErrors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Footer Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                    <button
                      type="button"
                      onClick={handleSkipProfile}
                      disabled={signingIn}
                      className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={signingIn}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {signingIn ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
