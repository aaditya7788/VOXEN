"use client";
import { useState } from "react";

export type PollStatus = "active" | "pending" | "closed";

export interface Poll {
  id: number;
  author: { name: string; avatar?: string; initials?: string; badge?: string };
  title: string;
  description?: string;
  status: PollStatus;
  timeAgo: string;
  options: { label: string; percentage?: number; selected?: boolean }[];
  votes: number;
  endsIn?: string;
  comments?: number;
  hasVoted?: boolean;
}

const statusColors: Record<PollStatus, string> = {
  active: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-900/30",
  pending: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
  closed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

export default function PollCard({ poll }: { poll: Poll }) {
  const [selectedOption, setSelectedOption] = useState<string | null>(
    poll.options.find((o) => o.selected)?.label || null
  );

  const hasPercentages = poll.options.some((o) => o.percentage !== undefined);

  return (
    <article className={`bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border shadow-soft p-4 md:p-6 transition-all hover:border-primary/30 dark:hover:border-primary/30 ${poll.status === "closed" ? "opacity-80 hover:opacity-100" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 md:mb-5">
        <div className="flex items-center gap-2.5 md:gap-3">
          {poll.author.avatar ? (
            <div className="size-9 md:size-11 rounded-full bg-cover bg-center border border-base-border dark:border-dark-border shrink-0" style={{ backgroundImage: `url('${poll.author.avatar}')` }} />
          ) : (
            <div className="size-9 md:size-11 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs md:text-sm shadow-md shrink-0">
              {poll.author.initials}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm md:text-base font-bold text-base-text dark:text-dark-text leading-tight truncate">{poll.author.name}</h3>
            <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-base-text-secondary mt-0.5">
              {poll.author.badge && (
                <>
                  <span className="bg-base-bg-secondary dark:bg-dark-border px-1 md:px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-medium tracking-wide">{poll.author.badge}</span>
                  <span>•</span>
                </>
              )}
              <span>{poll.timeAgo}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide border ${statusColors[poll.status]}`}>
            {poll.status}
          </span>
          <button className="text-base-text-secondary hover:text-base-text dark:hover:text-dark-text transition-colors p-1">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-base md:text-xl font-bold text-base-text dark:text-dark-text mb-2 md:mb-3">{poll.title}</h2>
        {poll.description && (
          <p className="text-base-text-secondary dark:text-dark-text-secondary text-xs md:text-sm leading-relaxed line-clamp-3 md:line-clamp-none">{poll.description}</p>
        )}
      </div>

      {/* Options */}
      {poll.status === "closed" ? (
        <ClosedPollOptions options={poll.options} />
      ) : hasPercentages ? (
        <VotedPollOptions options={poll.options} />
      ) : (
        <VotingOptions pollId={poll.id} options={poll.options} selectedOption={selectedOption} onSelect={setSelectedOption} />
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 pt-3 md:pt-4 border-t border-base-border dark:border-dark-border/50">
        {poll.hasVoted ? (
          <>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>You voted</span>
            </div>
            <span className="text-xs font-medium text-base-text-secondary dark:text-dark-text-secondary">{poll.votes} votes total</span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 md:gap-6 text-xs font-medium text-base-text-secondary dark:text-dark-text-secondary">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>{poll.votes} votes</span>
              </div>
              {poll.endsIn && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Ends in {poll.endsIn}</span>
                </div>
              )}
            </div>
            {poll.comments !== undefined && (
              <button className="text-xs font-bold text-base-text hover:text-primary dark:text-dark-text dark:hover:text-primary transition-colors">
                View discussion ({poll.comments})
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function ClosedPollOptions({ options }: { options: Poll["options"] }) {
  const maxPercentage = Math.max(...options.map((o) => o.percentage || 0));
  
  return (
    <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mb-4">
      {options.map((option) => {
        const isWinner = option.percentage === maxPercentage;
        return (
          <div
            key={option.label}
            className={`flex-1 ${isWinner ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30" : "bg-gray-50 dark:bg-dark-border border-base-border dark:border-dark-border grayscale opacity-60"} border rounded-lg md:rounded-xl p-3 md:p-4 flex flex-row sm:flex-col items-center justify-between sm:justify-center`}
          >
            <span className={`text-2xl md:text-3xl font-bold tracking-tight ${isWinner ? "text-green-600 dark:text-green-400" : "text-base-text dark:text-dark-text"}`}>
              {option.percentage}%
            </span>
            <span className={`text-xs font-bold uppercase sm:mt-1 ${isWinner ? "text-green-700 dark:text-green-300" : "text-base-text-secondary dark:text-dark-text-secondary"}`}>
              {option.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VotedPollOptions({ options }: { options: Poll["options"] }) {
  return (
    <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
      {options.map((option) => (
        <div key={option.label} className="group relative rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-base-bg-secondary dark:bg-dark-border rounded-lg" />
          <div
            className={`absolute inset-0 ${option.selected ? "bg-primary/10 dark:bg-primary/20" : "bg-base-border dark:bg-gray-700 opacity-30"} rounded-lg origin-left transition-all duration-500`}
            style={{ width: `${option.percentage}%` }}
          />
          <div className="relative flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 z-10">
            <div className="flex items-center gap-2">
              <span className={`text-xs md:text-sm ${option.selected ? "font-semibold text-base-text dark:text-dark-text" : "font-medium text-base-text-secondary dark:text-dark-text-secondary"} transition-colors`}>
                {option.label}
              </span>
              {option.selected && (
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
            </div>
            <span className={`text-xs md:text-sm ${option.selected ? "font-bold text-base-text dark:text-dark-text" : "font-medium text-base-text-secondary dark:text-dark-text-secondary"}`}>
              {option.percentage}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VotingOptions({ pollId, options, selectedOption, onSelect }: { pollId: number; options: Poll["options"]; selectedOption: string | null; onSelect: (label: string) => void }) {
  return (
    <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
      {options.map((option) => (
        <label
          key={option.label}
          className={`flex items-center justify-between p-3 md:p-3.5 rounded-lg md:rounded-xl border cursor-pointer group transition-all ${
            selectedOption === option.label
              ? "border-primary bg-primary/[0.02] dark:bg-primary/[0.05] shadow-[0_0_0_1px_rgba(0,82,255,1)]"
              : "border-base-border dark:border-dark-border hover:border-primary/50 dark:hover:border-primary/50 active:border-primary/50 bg-white dark:bg-dark-bg-secondary"
          }`}
        >
          <span className={`text-xs md:text-sm ${selectedOption === option.label ? "font-bold text-primary" : "font-medium text-base-text dark:text-dark-text group-hover:text-primary"} transition-colors`}>
            {option.label}
          </span>
          <div className="relative flex items-center justify-center shrink-0">
            <input
              type="radio"
              name={`poll-${pollId}`}
              checked={selectedOption === option.label}
              onChange={() => onSelect(option.label)}
              className="peer appearance-none size-4 md:size-5 rounded-full border border-base-text-secondary/40 checked:border-primary checked:bg-primary transition-colors focus:ring-offset-0 focus:ring-0"
            />
            <div className="absolute size-1.5 md:size-2 rounded-full bg-white opacity-0 peer-checked:opacity-100 pointer-events-none transform scale-0 peer-checked:scale-100 transition-transform" />
          </div>
        </label>
      ))}
    </div>
  );
}
