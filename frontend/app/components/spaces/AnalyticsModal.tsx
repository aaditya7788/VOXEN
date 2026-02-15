"use client";
import { useEffect, useState } from "react";
import { CloseOutline } from "react-ionicons";
import { Proposal } from "@/app/services/proposalApi";

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName?: string;
  proposals: Proposal[];
  token?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function AnalyticsModal({ isOpen, onClose, spaceId, spaceName, proposals, token }: AnalyticsModalProps) {
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

  // Calculate overall statistics
  const overallStats = {
    totalProposals: proposals.length,
    activeProposals: proposals.filter((p) => p.status === "active").length,
    closedProposals: proposals.filter((p) => p.status === "closed").length,
    draftProposals: proposals.filter((p) => p.status === "draft").length,
    cancelledProposals: proposals.filter((p) => p.status === "cancelled").length,
    totalVotes: proposals.reduce((sum, p) => sum + (p.vote_count || 0), 0),
    avgVotesPerProposal: proposals.length > 0 ? Math.round((proposals.reduce((sum, p) => sum + (p.vote_count || 0), 0) / proposals.length) * 10) / 10 : 0,
  };

  // Get selected proposal details
  const selectedProposal = selectedProposalId ? proposals.find((p) => p.id === selectedProposalId) : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-dark-bg-secondary rounded-2xl border border-base-border dark:border-dark-border shadow-xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-base-border dark:border-dark-border bg-white dark:bg-dark-bg-secondary">
          <h2 className="text-xl md:text-2xl font-bold text-base-text dark:text-dark-text">
            {selectedProposal ? "Proposal Analytics" : "Space Analytics"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-base-bg-secondary dark:hover:bg-dark-border rounded-lg transition-colors"
          >
            <CloseOutline width="24px" height="24px" color="currentColor" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!selectedProposal ? (
            <>
              {/* Overall Statistics */}
              <div>
                <h3 className="text-lg font-semibold text-base-text dark:text-dark-text mb-4">
                  {spaceName || "Space"} Overview
                </h3>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard
                    label="Total Proposals"
                    value={overallStats.totalProposals}
                    icon="📊"
                  />
                  <StatCard
                    label="Active"
                    value={overallStats.activeProposals}
                    icon="🟢"
                  />
                  <StatCard
                    label="Closed"
                    value={overallStats.closedProposals}
                    icon="✓"
                  />
                  <StatCard
                    label="Draft"
                    value={overallStats.draftProposals}
                    icon="📝"
                  />
                  <StatCard
                    label="Cancelled"
                    value={overallStats.cancelledProposals}
                    icon="✕"
                  />
                  <StatCard
                    label="Total Votes"
                    value={overallStats.totalVotes}
                    icon="🗳️"
                  />
                </div>

                {/* Additional Metrics */}
                <div className="mt-6 p-4 bg-base-bg-secondary dark:bg-dark-border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-base-text dark:text-dark-text font-medium">
                      Average Votes per Proposal
                    </span>
                    <span className="text-xl font-bold text-primary">
                      {overallStats.avgVotesPerProposal}
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Proposal Stats */}
              <div>
                <h3 className="text-lg font-semibold text-base-text dark:text-dark-text mb-4">
                  Proposal Details
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {proposals.map((proposal) => (
                    <button
                      key={proposal.id}
                      onClick={() => setSelectedProposalId(proposal.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-base-bg-secondary dark:hover:bg-dark-border transition-colors border border-base-border dark:border-dark-border/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-base-text dark:text-dark-text truncate">
                            {proposal.title}
                          </h4>
                          <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary">
                            Status: <span className="font-medium capitalize">{proposal.status}</span>
                          </p>
                        </div>
                        <div className="ml-4 text-right">
                          <div className="text-sm font-bold text-base-text dark:text-dark-text">
                            {proposal.vote_count || 0} votes
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Back Button */}
              <button
                onClick={() => setSelectedProposalId(null)}
                className="text-sm text-primary hover:text-primary-hover font-semibold"
              >
                ← Back to Overview
              </button>

              {/* Proposal Details */}
              <div>
                <h3 className="text-lg font-semibold text-base-text dark:text-dark-text mb-2">
                  {selectedProposal.title}
                </h3>
                <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary">
                  {selectedProposal.description}
                </p>
              </div>

              {/* Proposal Stats */}
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Total Votes"
                  value={selectedProposal.vote_count || 0}
                  icon="🗳️"
                />
                <StatCard
                  label="Status"
                  value={selectedProposal.status}
                  icon="📌"
                  isText
                />
                <StatCard
                  label="Voting Type"
                  value={selectedProposal.voting_type}
                  icon="⚙️"
                  isText
                />
                <StatCard
                  label="Vote Options"
                  value={Array.isArray(selectedProposal.options) ? selectedProposal.options.length : 0}
                  icon="📋"
                />
              </div>

              {/* Voting Results */}
              <div>
                <h4 className="font-semibold text-base-text dark:text-dark-text mb-3">
                  Voting Results
                </h4>
                <div className="space-y-3">
                  {Array.isArray(selectedProposal.options) && selectedProposal.options.map((option, index) => {
                    const votes = selectedProposal.results?.[index.toString()] || 0;
                    const total = selectedProposal.vote_count || 1;
                    const percentage = Math.round((votes / total) * 100);

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-base-text dark:text-dark-text">
                            {option}
                          </span>
                          <span className="text-sm font-semibold text-primary">
                            {votes} votes ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-base-bg-secondary dark:bg-dark-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-base-bg-secondary dark:bg-dark-border rounded-lg">
                <div>
                  <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary uppercase">
                    Created
                  </p>
                  <p className="text-sm font-semibold text-base-text dark:text-dark-text">
                    {new Date(selectedProposal.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary uppercase">
                    End Date
                  </p>
                  <p className="text-sm font-semibold text-base-text dark:text-dark-text">
                    {new Date(selectedProposal.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  isText = false,
}: {
  label: string;
  value: string | number;
  icon: string;
  isText?: boolean;
}) {
  return (
    <div className="p-4 rounded-lg bg-base-bg-secondary dark:bg-dark-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary uppercase font-medium">
            {label}
          </p>
          {isText ? (
            <p className="text-lg font-bold text-base-text dark:text-dark-text capitalize mt-1">
              {value}
            </p>
          ) : (
            <p className="text-2xl font-bold text-primary mt-1">{value}</p>
          )}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}
