"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAccount, useSignMessage } from "wagmi";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export interface User {
  id: string;
  wallet_address: string;
  username: string | null;
  name: string | null;
  email: string | null;
  profile_pic: string;
  background_color: string;
  is_verified: boolean;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  needsProfile: boolean;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const isAuthenticated = !!user && !!token;
  const needsProfile = isAuthenticated && !user?.username;

  // Refresh user from localStorage
  const refreshUser = useCallback(() => {
    const savedUser = localStorage.getItem("voxen_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("voxen_token");
    const savedUser = localStorage.getItem("voxen_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Clear auth when wallet disconnects
  useEffect(() => {
    if (!isConnected && user) {
      signOut();
    }
  }, [isConnected]);

  // Sign in with wallet signature
  const signIn = useCallback(async (): Promise<boolean> => {
    if (!address || !isConnected) {
      setError("Please connect your wallet first");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get nonce from backend
      const nonceResponse = await fetch(`${API_BASE_URL}/auth/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address }),
      });

      const nonceData = await nonceResponse.json();

      if (!nonceResponse.ok) {
        setError(nonceData.message || "Failed to get nonce");
        return false;
      }

      const { nonce, message } = nonceData.data;

      // Step 2: Sign the message with wallet
      let signature: string;
      try {
        signature = await signMessageAsync({ message });
      } catch (signError: any) {
        if (signError.name === "UserRejectedRequestError") {
          setError("Signature request was rejected");
        } else {
          setError("Failed to sign message");
        }
        return false;
      }

      // Step 3: Verify signature with backend
      const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: address,
          signature,
          nonce,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        setError(verifyData.message || "Verification failed");
        return false;
      }

      // Success - store user and token
      const { user: userData, token: authToken } = verifyData.data;

      setUser(userData);
      setToken(authToken);

      localStorage.setItem("voxen_token", authToken);
      localStorage.setItem("voxen_user", JSON.stringify(userData));

      return true;
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err.message || "Sign in failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, signMessageAsync]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setToken(null);
      // Clear all local storage data as requested
      localStorage.clear();
    }
  }, [token]);

  // Update profile
  const updateProfile = useCallback(async (data: Partial<User>): Promise<boolean> => {
    if (!token) {
      setError("Not authenticated");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle session expired
        if (responseData.code === "SESSION_EXPIRED" || responseData.code === "TOKEN_EXPIRED") {
          await signOut();
          setError("Session expired. Please sign in again.");
          return false;
        }
        setError(responseData.message || "Update failed");
        return false;
      }

      // Update local user data
      const updatedUser = { ...user, ...responseData.data } as User;
      setUser(updatedUser);
      localStorage.setItem("voxen_user", JSON.stringify(updatedUser));

      return true;
    } catch (err: any) {
      console.error("Update profile error:", err);
      setError(err.message || "Update failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [token, user, signOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        error,
        needsProfile,
        signIn,
        signOut,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
