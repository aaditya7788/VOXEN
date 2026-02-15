// Profile API Service - Handle all profile-related API calls
import { useAccount } from 'wagmi';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface UserProfile {
  id: string;
  username: string;
  name: string;
  bio: string;
  email?: string;
  email_verified?: boolean;
  email_otp_verified?: boolean;
  profile_pic?: string;
  background_color?: string;
  is_verified: boolean;
  created_at: string;
  twitter_handle?: string;
  twitter_linked_at?: string;
  discord_handle?: string;
  discord_linked_at?: string;
  telegram_handle?: string;
  telegram_linked_at?: string;
  email_verified_at?: string;
}

interface ActivityItem {
  id: string;
  user_id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface NotificationPreferences {
  id: string;
  user_id: string;
  email_on_proposal: boolean;
  email_on_vote: boolean;
  email_on_member_join: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark';
  language: string;
  privacy_level: 'public' | 'private' | 'friends';
  two_factor_enabled: boolean;
  email_verified: boolean;
}

// Get authorization token from localStorage
const getToken = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('voxen_token');
    //console.log("Retrieved token:", token); 
    return token;
  }
  return null;
};

// Make authenticated API request
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  console.log(`API Request to ${url} responded with status ${response.status}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
};

export const profileApi = {
  // Get current user's profile
  async getCurrentProfile(): Promise<UserProfile> {
    console.log("Fetching current user profile");
    const response = await fetchWithAuth(`${API_BASE_URL}/profile/me/profile`);
    return response.data || response;
  },

  // Get public user profile by ID or username
  async getUserProfile(identifier: string): Promise<UserProfile> {
    return fetch(`${API_BASE_URL}/profile/users/${identifier}`).then(r => r.json());
  },

  // Update current user's profile
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    return fetchWithAuth(`${API_BASE_URL}/profile/me/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Upload user avatar
  async uploadAvatar(file: File): Promise<{ success: boolean; url: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/profile/me/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload avatar');
    }

    return response.json();
  },

  // Update user bio
  async updateBio(bio: string): Promise<UserProfile> {
    return fetchWithAuth(`${API_BASE_URL}/profile/me/bio`, {
      method: 'PUT',
      body: JSON.stringify({ bio }),
    });
  },

  // Update username
  async updateUsername(username: string): Promise<UserProfile> {
    return fetchWithAuth(`${API_BASE_URL}/profile/me/username`, {
      method: 'PUT',
      body: JSON.stringify({ username }),
    });
  },

  // Get user activities
  async getUserActivity(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ success: boolean; data: ActivityItem[] }> {
    const query = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return fetch(
      `${API_BASE_URL}/profile/users/${userId}/activities?${query}`
    ).then(r => r.json());
  },

  // Get current user's activity
  async getCurrentUserActivity(
    limit: number = 20,
    offset: number = 0
  ): Promise<{ success: boolean; data: ActivityItem[] }> {
    const query = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return fetchWithAuth(
      `${API_BASE_URL}/profile/me/activity?${query}`
    );
  },

  // Get user's spaces
  async getUserSpaces(userId: string): Promise<{ success: boolean; data: { spaces: any[] } }> {
    return fetch(`${API_BASE_URL}/profile/users/${userId}/spaces`).then(r =>
      r.json()
    );
  },

  // Get notification preferences
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return fetchWithAuth(`${API_BASE_URL}/profile/me/notification-preferences`);
  },

  // Update notification preferences
  async updateNotificationPreferences(
    prefs: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    return fetchWithAuth(`${API_BASE_URL}/profile/me/notification-preferences`, {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },

  // Get user settings
  async getUserSettings(): Promise<UserSettings> {
    const response = await fetchWithAuth(`${API_BASE_URL}/profile/me/settings`);
    return response.data || response;
  },

  // Update user settings
  async updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return fetchWithAuth(`${API_BASE_URL}/profile/me/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Get KYC status
  async getKYCStatus(): Promise<{
    success?: boolean;
    status?: string;
    verified_at?: string;
    eligibility?: {
      eligible: boolean;
      reason: string;
      linkedAccounts?: Array<{
        platform: string;
        linkedDate: string;
        isOldEnough: boolean;
      }>;
      nextEligibleDate?: string;
    };
  }> {
    const response = await fetchWithAuth(`${API_BASE_URL}/profile/me/kyc-status`);
    return response.data || response;
  },

  // Submit KYC verification
  async submitKYCVerification(data: {
    documentType: string;
    documentFile: File;
  }): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('document_type', data.documentType);
    formData.append('document', data.documentFile);

    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/profile/me/kyc-verify`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to submit KYC verification');
    }

    return response.json();
  },

  // Get user notifications
  async getUserNotifications(userId: string): Promise<{ success: boolean; data: any[] }> {
    return fetch(`${API_BASE_URL}/profile/users/${userId}/notifications`).then(r =>
      r.json()
    );
  },

  // Search users
  async searchUsers(query: string): Promise<{ success: boolean; data: UserProfile[] }> {
    return fetch(
      `${API_BASE_URL}/profile/search?q=${encodeURIComponent(query)}`
    ).then(r => r.json());
  },

  // Delete account
  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    return fetchWithAuth(`${API_BASE_URL}/profile/me/account`, {
      method: 'DELETE',
    });
  },
};
