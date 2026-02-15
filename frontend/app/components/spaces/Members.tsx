"use client";

import { useEffect, useState } from "react";
import { PeopleOutline } from "react-ionicons";

interface Member {
    user_id: string;
    username: string;
    profile_pic?: string;
    role: string;
    joined_at: string;
    voting_power?: number;
}

export default function Members({ spaceId }: { spaceId?: string }) {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (!spaceId) return;

        const fetchMembers = async () => {
            try {
                setLoading(true);
                const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
                const token = typeof window !== "undefined" ? localStorage.getItem("voxen_token") : null;

                // Members endpoint is public usually, but let's check auth
                const headers: HeadersInit = {
                    "Content-Type": "application/json",
                };
                if (token) {
                    headers["Authorization"] = `Bearer ${token}`;
                }

                const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/members?page=${page}&limit=20`, {
                    headers,
                });

                if (!response.ok) {
                    // fallback for spaces that might not exist or other errors
                    if (response.status === 404) {
                        setMembers([]);
                        setLoading(false);
                        return;
                    }
                    throw new Error(`API error: ${response.status}`);
                }

                const data = await response.json();
                const memberList = data.data || [];
                setMembers(Array.isArray(memberList) ? memberList : []);
                if (data.pagination) {
                    setTotalPages(data.pagination.pages || 1);
                }
            } catch (err: any) {
                console.error("Failed to load members:", err);
                setError(err.message || "Failed to load members");
            } finally {
                setLoading(false);
            }
        };

        fetchMembers();
    }, [spaceId, page]);

    if (loading && members.length === 0) {
        return (
            <div className="text-center py-12 text-base-text-secondary">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                Loading members...
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-red-500">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-sm font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide">
                    Members ({members.length})
                </h3>
            </div>

            {members.length === 0 ? (
                <div className="text-center py-12 text-base-text-secondary bg-base-bg-secondary dark:bg-dark-bg-secondary rounded-xl border border-dashed border-base-border dark:border-dark-border">
                    <PeopleOutline width="48px" height="48px" color="currentColor" className="mx-auto mb-4 opacity-30" />
                    <p>No members found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {members.map((member) => (
                        <div
                            key={member.user_id}
                            className="flex items-center gap-3 p-3 bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border"
                        >
                            {member.profile_pic ? (
                                <img
                                    src={member.profile_pic}
                                    alt={member.username}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {member.username?.charAt(0).toUpperCase() || "U"}
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-base-text dark:text-dark-text truncate">
                                    {member.username}
                                </p>
                                <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary capitalize">
                                    {member.role}
                                </p>
                            </div>
                            {/* Placeholder for view profile or other actions */}
                        </div>
                    ))}
                </div>
            )}

            {/* Simple Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 text-sm bg-white dark:bg-dark-bg-secondary border border-base-border dark:border-dark-border rounded-lg disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="px-3 py-1 text-sm self-center">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 text-sm bg-white dark:bg-dark-bg-secondary border border-base-border dark:border-dark-border rounded-lg disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
