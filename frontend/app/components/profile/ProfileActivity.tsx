"use client";
import { useEffect, useState } from "react";

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  space_name?: string;
  space_slug?: string;
  proposal_title?: string;
  created_at: string;
}

export default function ProfileActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        const token = typeof window !== "undefined" ? localStorage.getItem("voxen_token") : null;

        if (!token) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/activities/user?limit=20`, {
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

    loadActivities();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24 pb-20">
        <p className="text-center text-base-text-secondary dark:text-dark-text-secondary">Loading activities...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24 pb-20 md:pb-6">
      <div className="mb-5 md:mb-8">
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-base-text dark:text-dark-text mb-1 md:mb-2">
          Activity
        </h2>
        <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
          Your recent activities across all spaces
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4 text-red-600 dark:text-red-400 mb-4">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border divide-y divide-base-border dark:divide-dark-border">
        {activities.length > 0 ? (
          activities.map((activity: any) => (
            <div
              key={activity.id}
              className="p-3 md:p-4 flex items-start gap-3 md:gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0 mt-1">
                {activity.activity_type === "proposal_created" && "📋"}
                {activity.activity_type === "proposal_closed" && "✓"}
                {activity.activity_type === "proposal_voted" && "✓"}
                {activity.activity_type === "member_joined" && "➕"}
                {!["proposal_created", "proposal_closed", "proposal_voted", "member_joined"].includes(activity.activity_type) && "•"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="text-xs md:text-sm font-medium text-base-text dark:text-dark-text">
                    {activity.description}
                  </p>
                  {activity.space_name && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-base-bg-secondary dark:bg-dark-border text-base-text-secondary dark:text-dark-text-secondary">
                      {activity.space_name}
                    </span>
                  )}
                </div>
                <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">
                  {new Date(activity.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center">
            <p className="text-base-text-secondary dark:text-dark-text-secondary">
              No activities yet. Start by joining a space or creating a proposal!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
