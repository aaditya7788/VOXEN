"use client";

import { useEffect, useState } from "react";

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  username: string;
  proposal_title?: string;
  created_at: string;
  proposal_id?: string;
}

export default function Activity({ spaceId, onProposalClick }: { spaceId?: string; onProposalClick?: (proposalId: string) => void }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spaceId) return;

    const fetchActivities = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        const token = typeof window !== "undefined" ? localStorage.getItem("voxen_token") : null;

        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/activities/spaces/${spaceId}?limit=10`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const activityList = data.data || [];
        setActivities(Array.isArray(activityList) ? activityList : []);
      } catch (err: any) {
        console.error("Failed to load activities:", err);
        setError(err.message || "Failed to load activities");
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [spaceId]);

  const getActivityColor = (type: string) => {
    switch (type) {
      case "proposal_created":
        return "bg-blue-500";
      case "proposal_voted":
        return "bg-green-500";
      case "proposal_closed":
        return "bg-indigo-500";
      case "member_joined":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24 pb-20 md:pb-6">
      <div className="mb-5 md:mb-8">
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-base-text dark:text-dark-text mb-1 md:mb-2">
          Activity
        </h2>
        <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
          Recent activity in your space
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4 text-red-600 dark:text-red-400 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center p-6 text-base-text-secondary dark:text-dark-text-secondary">
          Loading activities...
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border">
          {activities.length > 0 ? (
            activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`p-3 md:p-4 flex items-start gap-3 md:gap-4 hover:bg-base-bg-secondary dark:hover:bg-dark-border/30 transition-colors cursor-pointer ${
                  index !== activities.length - 1 ? "border-b border-base-border dark:border-dark-border" : ""
                }`}
                onClick={() => {
                  if (activity.proposal_id && onProposalClick) {
                    onProposalClick(activity.proposal_id);
                  }
                }}
              >
                {/* Avatar */}
                <div
                  className={`size-8 md:size-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0 text-xs md:text-sm ${getActivityColor(
                    activity.activity_type
                  )}`}
                >
                  {(activity.username || "U").charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm text-base-text dark:text-dark-text line-clamp-2">
                    <span className="font-semibold">{activity.username || "User"}</span>
                    {" "}
                    <span className="text-base-text-secondary dark:text-dark-text-secondary">
                      {activity.description}
                    </span>
                    {activity.proposal_title && (
                      <span className="font-medium text-primary ml-1 hover:underline">
                        {activity.proposal_title}
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary mt-0.5 md:mt-1">
                    {formatTimeAgo(activity.created_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-6 text-base-text-secondary dark:text-dark-text-secondary">
              <p className="text-sm">No activities yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
