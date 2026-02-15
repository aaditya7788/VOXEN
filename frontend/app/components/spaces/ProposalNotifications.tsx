"use client";

import { useEffect, useState } from "react";
import { CloseOutline, AlertOutline, CheckmarkCircleOutline, TimeOutline } from "react-ionicons";

interface ProposalNotification {
  id: string;
  title: string;
  status: "opening" | "closing_soon" | "closed";
  timeUntil?: string;
  endDate: string;
}

export default function ProposalNotifications({
  spaceId,
  onProposalClick,
}: {
  spaceId?: string;
  onProposalClick?: (proposalId: string) => void;
}) {
  const [notifications, setNotifications] = useState<ProposalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!spaceId) return;

    const fetchProposals = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
        const token = typeof window !== "undefined" ? localStorage.getItem("voxen_token") : null;

        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/proposals`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          setLoading(false);
          return;
        }

        const data = await response.json();
        const proposals = data.data || [];
        const now = new Date();
        const notifs: ProposalNotification[] = [];

        proposals.forEach((proposal: any) => {
          const startDate = new Date(proposal.start_date);
          const endDate = new Date(proposal.end_date);
          const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          const hoursUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          const daysUntilEnd = hoursUntilEnd / 24;

          // Opening soon (within 2 hours)
          if (hoursUntilStart > 0 && hoursUntilStart <= 2 && proposal.status === "active") {
            notifs.push({
              id: `${proposal.id}-opening`,
              title: proposal.title,
              status: "opening",
              timeUntil: `Opens in ${Math.round(hoursUntilStart * 60)}m`,
              endDate: proposal.end_date,
            });
          }

          // Closing soon (within 24 hours)
          if (hoursUntilEnd > 0 && hoursUntilEnd <= 24 && proposal.status === "active") {
            const timeStr =
              daysUntilEnd > 1
                ? `${Math.round(daysUntilEnd)} days`
                : `${Math.round(hoursUntilEnd)}h`;
            notifs.push({
              id: `${proposal.id}-closing`,
              title: proposal.title,
              status: "closing_soon",
              timeUntil: `Closes in ${timeStr}`,
              endDate: proposal.end_date,
            });
          }

          // Closed
          if (proposal.status === "closed") {
            notifs.push({
              id: `${proposal.id}-closed`,
              title: proposal.title,
              status: "closed",
              endDate: proposal.end_date,
            });
          }
        });

        setNotifications(notifs);
      } catch (err) {
        console.error("Failed to fetch proposals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
    
    // Refresh notifications every minute
    const interval = setInterval(fetchProposals, 60000);
    return () => clearInterval(interval);
  }, [spaceId]);

  const dismissNotification = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const visibleNotifications = notifications.filter((n) => !dismissed.has(n.id));

  if (loading || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 md:right-6 z-40 space-y-3 max-w-sm">
      {visibleNotifications.map((notif) => (
        <div
          key={notif.id}
          className={`p-4 rounded-lg border shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-105 ${
            notif.status === "opening"
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/30"
              : notif.status === "closing_soon"
              ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/30"
              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30"
          }`}
          onClick={() => {
            const proposalId = notif.id.split("-")[0];
            if (onProposalClick) onProposalClick(proposalId);
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div
                className={`flex-shrink-0 mt-0.5 ${
                  notif.status === "opening"
                    ? "text-blue-500"
                    : notif.status === "closing_soon"
                    ? "text-amber-500"
                    : "text-green-500"
                }`}
              >
                {notif.status === "opening" && <TimeOutline width="20px" height="20px" color="currentColor" />}
                {notif.status === "closing_soon" && <AlertOutline width="20px" height="20px" color="currentColor" />}
                {notif.status === "closed" && <CheckmarkCircleOutline width="20px" height="20px" color="currentColor" />}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    notif.status === "opening"
                      ? "text-blue-900 dark:text-blue-200"
                      : notif.status === "closing_soon"
                      ? "text-amber-900 dark:text-amber-200"
                      : "text-green-900 dark:text-green-200"
                  }`}
                >
                  {notif.title}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    notif.status === "opening"
                      ? "text-blue-700 dark:text-blue-300"
                      : notif.status === "closing_soon"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-green-700 dark:text-green-300"
                  }`}
                >
                  {notif.status === "opening" && "🎯 Proposal opening soon"}
                  {notif.status === "closing_soon" && "⏰ Proposal closing soon"}
                  {notif.status === "closed" && "✅ Proposal closed"}
                </p>
                {notif.timeUntil && (
                  <p
                    className={`text-xs mt-1 font-medium ${
                      notif.status === "opening"
                        ? "text-blue-600 dark:text-blue-400"
                        : notif.status === "closing_soon"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    {notif.timeUntil}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissNotification(notif.id);
              }}
              className={`flex-shrink-0 p-1 rounded-lg transition-colors ${
                notif.status === "opening"
                  ? "text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  : notif.status === "closing_soon"
                  ? "text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  : "text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30"
              }`}
            >
              <CloseOutline width="18px" height="18px" color="currentColor" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
