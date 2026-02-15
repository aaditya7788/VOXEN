// Proposal API Service - Handle all proposal-related API calls
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export type VotingType = "single" | "multiple" | "weighted";
export type ProposalStatus = "draft" | "active" | "closed" | "cancelled";

export interface Proposal {
  id: string;
  space_id: string;
  creator_id: string;
  title: string;
  description?: string | null;
  voting_type: VotingType;
  options: string[] | any;
  start_date: string;
  end_date: string;
  status: ProposalStatus;
  vote_count: number;
  results: Record<string, number> | any;
  created_at: string;
  updated_at: string;
  creator_username?: string | null;
  creator_pic?: string | null;
  user_vote?: any; // Current user's vote data (if any)
  use_blockchain?: boolean;
  blockchain_proposal_id?: number | null;
  blockchain_tx_hash?: string | null;
  transaction_hash?: string | null;
  contract_address?: string | null;
  blockchain_verified?: boolean;
  space_name?: string;
  space_image?: string;
}

export interface ProposalListResponse {
  success?: boolean;
  data?: Proposal[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Get authorization token from localStorage
const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("voxen_token");
  }
  return null;
};

// Make API request (optionally authenticated)
const request = async (url: string, options: RequestInit = {}, requireAuth = false) => {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (requireAuth) {
    throw new Error("Authentication required. Please sign in to continue.");
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data: any;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = { message: await response.text() || "Unknown error" };
    }

    if (!response.ok) {
      throw new Error(data.message || `API Error: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error: any) {
    if (error instanceof TypeError) {
      throw new Error(`Network error: ${error.message}. Check your connection or server availability.`);
    }
    throw error;
  }
};

export const proposalApi = {
  async getSpaceProposals(
    spaceId: string,
    params: {
      status?: ProposalStatus;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
    } = {}
  ): Promise<ProposalListResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.page) query.set("page", params.page.toString());
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);

    const queryString = query.toString();
    const url = `${API_BASE_URL}/spaces/${spaceId}/proposals${queryString ? `?${queryString}` : ""}`;
    return request(url);
  },

  async getProposal(spaceId: string, proposalId: string): Promise<{ success?: boolean; data?: Proposal }> {
    return request(`${API_BASE_URL}/spaces/${spaceId}/proposals/${proposalId}`);
  },

  async createProposal(
    spaceId: string,
    payload: {
      title: string;
      description?: string;
      voting_type: VotingType;
      options: string[];
      start_date?: string;
      end_date: string;
      use_blockchain?: boolean;
      blockchain_proposal_id?: number | null;
      blockchain_tx_hash?: string | null;
      blockchain_verified?: boolean;
    }
  ): Promise<{ success?: boolean; data?: Proposal; message?: string }> {
    return request(
      `${API_BASE_URL}/spaces/${spaceId}/proposals`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async castVote(
    spaceId: string,
    proposalId: string,
    payload: {
      votes: Record<string, any> | number[] | { option: number };
      blockchain_tx_hash?: string;
      vote_hash?: string;
    }
  ): Promise<{ success?: boolean; data?: { vote: any; proposal: Proposal } }> {
    return request(
      `${API_BASE_URL}/spaces/${spaceId}/proposals/${proposalId}/vote`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      true
    );
  },

  async closeProposal(
    spaceId: string,
    proposalId: string
  ): Promise<{ success?: boolean; data?: Proposal; message?: string }> {
    return request(
      `${API_BASE_URL}/spaces/${spaceId}/proposals/${proposalId}/close`,
      {
        method: "POST",
      },
      true
    );
  },
  async checkUserVote(
    spaceId: string,
    proposalId: string
  ): Promise<{ success?: boolean; data?: { voted: boolean; vote: any } }> {
    return request(
      `${API_BASE_URL}/spaces/${spaceId}/proposals/${proposalId}/check-vote`,
      {},
      true
    );
  },
  async getProposalAnalytics(
    spaceId: string,
    proposalId: string
  ): Promise<{ success?: boolean; data?: any }> {
    return request(
      `${API_BASE_URL}/spaces/${spaceId}/proposals/${proposalId}/analytics`,
      {},
      true
    );
  },

  async getUserFeed(limit = 10): Promise<{ success?: boolean; data?: Proposal[] }> {
    return request(
      `${API_BASE_URL}/feed?limit=${limit}`,
      {},
      true
    );
  }
};
