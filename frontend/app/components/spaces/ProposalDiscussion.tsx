"use client";
import { useEffect, useState, useRef } from "react";
import { SendOutline, TrashOutline } from "react-ionicons";
import { getWebSocketService } from "@/app/services/websocketService";

interface DiscussionMessage {
  id: string;
  proposal_id: string;
  user_id: string;
  username?: string;
  profile_pic?: string;
  message: string;
  created_at: string;
  updated_at?: string;
}

interface ProposalDiscussionProps {
  proposalId: string;
  spaceId?: string;
  currentUserId?: string;
  currentUsername?: string;
  token?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function ProposalDiscussion({
  proposalId,
  spaceId,
  currentUserId,
  currentUsername,
  token,
}: ProposalDiscussionProps) {
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState(getWebSocketService());

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/proposals/${proposalId}/discussion`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          setMessages([]);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setMessages(data.data || []);
        scrollToBottom();
      } catch (err) {
        console.error("Error fetching discussion messages:", err);
        setError("Failed to load discussion");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [proposalId, spaceId, token]);

  // Connect to WebSocket and listen for new messages
  useEffect(() => {
    if (!token) return;

    const connectWebSocket = async () => {
      try {
        await ws.connect(token);

        // Join proposal discussion room
        ws.send("join_discussion", { proposal_id: proposalId });

        // Listen for new messages
        const unsubscribe = ws.on("discussion_message", (data) => {
          if (data.proposal_id === proposalId) {
            setMessages((prev) => [...prev, data.message]);
            scrollToBottom();
          }
        });

        return unsubscribe;
      } catch (err) {
        console.error("Failed to connect WebSocket:", err);
      }
    };

    connectWebSocket();

    return () => {
      ws.send("leave_discussion", { proposal_id: proposalId });
    };
  }, [proposalId, token, ws]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim() || !token) return;

    const userMessage = messageInput;
    setMessageInput("");
    setIsSending(true);

    // Optimistically add message to UI
    const optimisticMessage: DiscussionMessage = {
      id: Date.now().toString(),
      proposal_id: proposalId,
      user_id: currentUserId || "",
      username: currentUsername || "Unknown",
      message: userMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/proposals/${proposalId}/discussion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
        setError("Failed to send message");
        return;
      }

      const data = await response.json();
      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? data.data : m))
      );
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!token) return;

    // Optimistically remove from UI
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/proposals/${proposalId}/discussion/${messageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Re-fetch messages on error
        setError("Failed to delete message");
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      setError("Failed to delete message");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-bg-secondary rounded-lg border border-base-border dark:border-dark-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-base-border dark:border-dark-border bg-base-bg-secondary dark:bg-dark-border/30">
        <h3 className="font-semibold text-base-text dark:text-dark-text">Discussion</h3>
        <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary mt-1">
          {messages.length} {messages.length === 1 ? "message" : "messages"}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4 max-h-96">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary">
              Loading discussion...
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary">
              No messages yet. Start the discussion!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className="group flex gap-3 hover:bg-base-bg-secondary dark:hover:bg-dark-border/20 p-2.5 rounded-lg transition-colors">
                {msg.profile_pic ? (
                  <div
                    className="size-8 rounded-full bg-cover bg-center border border-base-border dark:border-dark-border shrink-0"
                    style={{ backgroundImage: `url('${msg.profile_pic}')` }}
                  />
                ) : (
                  <div className="size-8 rounded-full flex items-center justify-center bg-primary text-white text-xs font-bold shrink-0">
                    {(msg.username || "U").charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-base-text dark:text-dark-text">
                        {msg.username || "Unknown User"}
                      </p>
                      <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    {currentUserId === msg.user_id && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                        title="Delete message"
                      >
                        <TrashOutline width="16px" height="16px" color="#ef4444" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-base-text dark:text-dark-text mt-1 break-words">
                    {msg.message}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-900/30">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      {token ? (
        <form onSubmit={handleSendMessage} className="p-3 border-t border-base-border dark:border-dark-border bg-base-bg-secondary dark:bg-dark-border/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Add to discussion..."
              className="flex-1 px-3 py-2 bg-white dark:bg-dark-bg-secondary text-base-text dark:text-dark-text placeholder:text-base-text-secondary/50 border border-base-border dark:border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || isSending}
              className="p-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              <SendOutline width="18px" height="18px" color="currentColor" />
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 border-t border-base-border dark:border-dark-border bg-orange-50 dark:bg-orange-900/10">
          <p className="text-xs text-orange-700 dark:text-orange-400">
            Sign in to join the discussion
          </p>
        </div>
      )}
    </div>
  );
}
