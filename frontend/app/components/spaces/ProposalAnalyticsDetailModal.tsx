"use client";
import { useState, useMemo, useEffect } from "react";
import { CloseOutline, ChevronBackOutline, ChevronForwardOutline } from "react-ionicons";

interface ProposalAnalyticsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  analyticsData: any;
}

export default function ProposalAnalyticsDetailModal({
  isOpen,
  onClose,
  analyticsData,
}: ProposalAnalyticsDetailModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const votersPerPage = 10;
  const maxVoters = 30;

  // Reset page when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
  }, [isOpen]);

  if (!isOpen || !analyticsData) {
    return null;
  }

  const proposal = analyticsData?.proposal;
  const analytics = analyticsData?.analytics;

  if (!proposal || !analytics) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div
          className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border p-6 text-center w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-base-text dark:text-dark-text">Unable to load analytics data</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }
  
  const voters = analytics.voter_list || [];
  
  // Limit to max 30 voters
  const limitedVoters = voters.slice(0, maxVoters);
  const totalPages = limitedVoters.length > 0 ? Math.ceil(limitedVoters.length / votersPerPage) : 1;
  
  // Paginate voters
  const paginatedVoters = useMemo(() => {
    const startIdx = (currentPage - 1) * votersPerPage;
    const endIdx = startIdx + votersPerPage;
    return limitedVoters.slice(startIdx, endIdx);
  }, [currentPage, limitedVoters]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-base-border dark:border-dark-border max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-base-border dark:border-dark-border bg-white dark:bg-dark-bg-secondary">
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-bold text-base-text dark:text-dark-text">
              {proposal?.title}
            </h2>
            <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary mt-1">
              {proposal?.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-base-border dark:hover:bg-dark-border rounded-lg transition-colors ml-4 flex-shrink-0"
          >
            <CloseOutline width="24px" height="24px" color="currentColor" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status & Info */}
          <div className="flex flex-wrap gap-3">
            <div className="px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
              {proposal?.status || "active"}
            </div>
            <div className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium">
              Total Votes: {analytics?.total_votes}
            </div>
            <div className="px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-medium">
              {proposal?.voting_type}
            </div>
          </div>

          {/* Voting Results */}
          <div>
            <h3 className="text-base font-semibold text-base-text dark:text-dark-text mb-4">
              Voting Results
            </h3>
            <div className="space-y-4">
              {analytics?.voting_results?.map((result: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-base-text dark:text-dark-text">
                      {result.option}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {result.percentage}% ({result.votes})
                    </span>
                  </div>
                  <div className="w-full bg-base-bg-secondary dark:bg-dark-border rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                      style={{ width: `${result.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Option */}
          {analytics?.top_option && (
            <div className="p-4 bg-primary/10 dark:bg-primary/5 border border-primary/20 dark:border-primary/10 rounded-lg">
              <p className="text-xs font-semibold text-primary dark:text-primary/80 uppercase tracking-wide mb-1">
                Leading Option
              </p>
              <p className="text-base font-bold text-base-text dark:text-dark-text">
                {analytics.top_option.option}
              </p>
              <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary mt-1">
                {analytics.top_option.percentage}% ({analytics.top_option.votes} votes)
              </p>
            </div>
          )}

          {/* Voters List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-base-text dark:text-dark-text">
                Voters ({limitedVoters.length}{limitedVoters.length < voters.length ? " of " + voters.length : ""})
              </h3>
              {totalPages > 1 && (
                <span className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {paginatedVoters.length > 0 ? (
                paginatedVoters.map((voter: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg border border-base-border dark:border-dark-border bg-white dark:bg-dark-bg-secondary hover:bg-base-bg-secondary dark:hover:bg-dark-border/50 transition-colors"
                  >
                    {voter.profile_pic && (
                      <img
                        src={voter.profile_pic}
                        alt={voter.username}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-base-text dark:text-dark-text truncate">
                        {voter.username}
                      </p>
                      <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                        {new Date(voter.voted_at).toLocaleDateString()} •{" "}
                        {new Date(voter.voted_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-primary">
                        {voter.vote_power} vote{voter.vote_power !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary">
                    No voters yet
                  </p>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-base-border dark:border-dark-border">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-base-border dark:border-dark-border hover:bg-base-bg-secondary dark:hover:bg-dark-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronBackOutline width="18px" height="18px" color="currentColor" />
                </button>
                <span className="text-sm text-base-text-secondary dark:text-dark-text-secondary">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-base-border dark:border-dark-border hover:bg-base-bg-secondary dark:hover:bg-dark-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronForwardOutline width="18px" height="18px" color="currentColor" />
                </button>
              </div>
            )}

            {/* Note about pagination limit */}
            {voters.length > maxVoters && (
              <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary mt-3 text-center">
                Showing {maxVoters} most recent voters
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
