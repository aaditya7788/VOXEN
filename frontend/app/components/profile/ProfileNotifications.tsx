"use client";
import { useEffect, useState } from "react";
import { NotificationsOutline, CheckmarkCircle, EllipseOutline } from "react-ionicons";
import { profileApi } from "@/app/services/profileApi";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "vote" | "proposal" | "mention" | "system";
}

export default function ProfileNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);
  const [userNotifications, setUserNotifications] = useState<any[]>([]);

  // Load notifications on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        // Get current user's address to fetch notifications
        const result = await profileApi.getCurrentUserActivity(50, 0);
        if (result.success) {
          // Convert activity to notifications format
          const notifs: Notification[] = result.data.slice(0, 10).map((activity: any) => ({
            id: activity.id,
            title: formatTitle(activity.action),
            message: formatMessage(activity.action, activity.metadata),
            time: formatTimeAgo(activity.created_at),
            read: false,
            type: getNotificationType(activity.action),
          }));
          setNotifications(notifs);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const formatTitle = (action: string) => {
    switch (action) {
      case "vote_created":
        return "You voted on a proposal";
      case "proposal_created":
        return "New proposal created";
      case "space_joined":
        return "You joined a space";
      case "space_created":
        return "Space created successfully";
      case "comment_created":
        return "New comment";
      default:
        return action.replace(/_/g, " ");
    }
  };

  const formatMessage = (action: string, metadata?: Record<string, any>) => {
    switch (action) {
      case "vote_created":
        return `Your vote on "${metadata?.proposal_title || "Proposal"}" has been recorded.`;
      case "proposal_created":
        return `New proposal "${metadata?.proposal_title || "Proposal"}" is open for voting.`;
      case "space_joined":
        return `You are now a member of ${metadata?.space_name || "the space"} community.`;
      case "space_created":
        return `Your space "${metadata?.space_name || "New Space"}" has been created successfully.`;
      case "comment_created":
        return `New comment on "${metadata?.proposal_title || "Discussion"}".`;
      default:
        return "An update is available.";
    }
  };

  const getNotificationType = (action: string): "vote" | "proposal" | "mention" | "system" => {
    if (action.includes("vote")) return "vote";
    if (action.includes("proposal")) return "proposal";
    if (action.includes("mention")) return "mention";
    return "system";
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

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = filter === "all" ? notifications : notifications.filter((n) => !n.read);

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-10 xl:px-16 2xl:px-24 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-base-text dark:text-dark-text mb-0.5 md:mb-1">Notifications</h2>
          <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
            {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-primary hover:text-primary-hover font-medium text-xs md:text-sm whitespace-nowrap"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 md:mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-white"
              : "bg-white dark:bg-dark-bg-secondary border border-base-border dark:border-dark-border text-base-text dark:text-dark-text hover:border-primary"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors ${
            filter === "unread"
              ? "bg-primary text-white"
              : "bg-white dark:bg-dark-bg-secondary border border-base-border dark:border-dark-border text-base-text dark:text-dark-text hover:border-primary"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="mt-4 text-base-text-secondary dark:text-dark-text-secondary">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border p-8 md:p-12 text-center">
          <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full bg-base-bg-secondary dark:bg-dark-border flex items-center justify-center">
            <NotificationsOutline width="24px" height="24px" color="currentColor" />
          </div>
          <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">No notifications to show</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border overflow-hidden">
          {filteredNotifications.map((notification, index) => (
            <div
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              className={`flex items-start gap-3 md:gap-4 p-3 md:p-5 cursor-pointer hover:bg-base-bg-secondary dark:hover:bg-dark-border/30 transition-colors ${
                index !== filteredNotifications.length - 1 ? "border-b border-base-border dark:border-dark-border" : ""
              } ${!notification.read ? "bg-primary/5 dark:bg-primary/10" : ""}`}
            >
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${!notification.read ? "bg-primary/20" : "bg-base-bg-secondary dark:bg-dark-border"}`}>
                <NotificationsOutline width="16px" height="16px" color={!notification.read ? "#6366f1" : "currentColor"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-xs md:text-sm text-base-text dark:text-dark-text line-clamp-1 ${!notification.read ? "" : "opacity-80"}`}>
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <p className="text-[11px] md:text-sm text-base-text-secondary dark:text-dark-text-secondary mt-0.5 line-clamp-2">{notification.message}</p>
                <p className="text-[10px] md:text-xs text-base-text-secondary/60 dark:text-dark-text-secondary/60 mt-0.5 md:mt-1">{notification.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
