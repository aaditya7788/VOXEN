"use client";

import { useEffect, useState } from "react";

export default function Overview({ spaceId }: { spaceId: string }) {
  const [overviewData, setOverviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spaceId) {
      setError("Space ID is missing");
      setLoading(false);
      return;
    }

    const fetchOverviewData = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        const token = typeof window !== "undefined" ? localStorage.getItem("voxen_token") : null;
        
        const headers: any = {
          "Content-Type": "application/json",
        };
        
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/overview/${spaceId}`, {
          headers,
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Overview data received:", data);
        
        // Handle both direct data and wrapped data
        const overviewData = data.data || data;
        
        if (!overviewData) {
          throw new Error("No data in response");
        }
        
        setOverviewData(overviewData);
      } catch (err: any) {
        console.error("Failed to load overview data:", err);
        setError(err.message || "Failed to load overview data");
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [spaceId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24 pb-20 md:pb-6">
      <div className="mb-5 md:mb-8">
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-base-text dark:text-dark-text mb-1 md:mb-2">
          Overview
        </h2>
        <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
          Welcome to your space dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-4 md:p-5 lg:p-6 border border-base-border dark:border-dark-border">
          <h3 className="text-xs md:text-sm font-medium text-base-text-secondary dark:text-dark-text-secondary mb-1 md:mb-2">
            Active Proposals
          </h3>
          <p className="text-2xl md:text-3xl font-bold text-base-text dark:text-dark-text">
            {overviewData?.proposalCount ?? 0}
          </p>
        </div>
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl p-4 md:p-5 lg:p-6 border border-base-border dark:border-dark-border">
          <h3 className="text-xs md:text-sm font-medium text-base-text-secondary dark:text-dark-text-secondary mb-1 md:mb-2">
            Total Members
          </h3>
          <p className="text-2xl md:text-3xl font-bold text-base-text dark:text-dark-text">
            {overviewData?.memberCount ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-5 md:mt-8">
        <h3 className="text-sm md:text-base lg:text-lg font-semibold text-base-text dark:text-dark-text mb-3 md:mb-4">
          Recent Activity
        </h3>
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border divide-y divide-base-border dark:divide-dark-border">
          {(overviewData?.recentActivities?.length ?? 0) > 0 ? (
            overviewData?.recentActivities?.map((activity: any, index: number) => (
              <div
                key={activity.id || index}
                className="p-3 md:p-4 flex items-center gap-3 md:gap-4"
              >
                {activity.profile_pic && (
                  <img
                    src={activity.profile_pic}
                    alt={activity.username}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                )}
                {!activity.profile_pic && (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                    {(activity.username || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs md:text-sm font-medium text-base-text dark:text-dark-text">
                    <span className="font-semibold">{activity.username}</span> {activity.description}
                  </p>
                  <p className="text-[10px] md:text-xs text-base-text-secondary dark:text-dark-text-secondary">
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center p-4 text-sm text-base-text-secondary dark:text-dark-text-secondary">
              No recent activity
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
