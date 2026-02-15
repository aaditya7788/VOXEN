"use client";
import { useState, useEffect, useRef } from "react";
import {
  ArrowBackOutline,
  CalendarOutline,
  DocumentTextOutline,
  CheckmarkCircleOutline,
  AddOutline,
  CloseOutline,
  InformationCircleOutline
} from "react-ionicons";
import { useCreateProposal } from "@/app/hooks/useCreateProposal";
import Toast, { ToastMessage } from "../Toast";

interface NewProposalProps {
  onBack?: () => void;
  onSubmit?: (proposal: ProposalData) => void;
  spaceName?: string;
  spaceId?: string;
}

interface ProposalData {
  title: string;
  description: string;
  votingType: "single" | "multiple" | "weighted";
  options: string[];
  startDate: string;
  endDate: string;
}

const votingTypes = [
  {
    id: "single",
    name: "Single Choice",
    description: "Voters can select only one option",
    disabled: false,
  },
  {
    id: "multiple",
    name: "Multiple Choice (Coming Soon)",
    description: "Currently disabled - Single choice voting only",
    disabled: true,
  },
  {
    id: "weighted",
    name: "Weighted Voting (Coming Soon)",
    description: "Currently disabled - Single choice voting only",
    disabled: true,
  },
];

export default function NewProposal({ onBack, onSubmit, spaceName = "Space", spaceId }: NewProposalProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [votingType, setVotingType] = useState<"single" | "multiple" | "weighted">("single");
  const [options, setOptions] = useState(["", ""]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast helper function
  const addToast = (message: string, type: "success" | "error" | "info" | "loading" = "info", duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const { createProposal, isPending, isSuccess, hash, proposalId, error: blockchainError } = useCreateProposal();

  // Track processed transaction hashes to prevent duplicate backend saves
  const processedTxs = useRef<Set<string>>(new Set());

  // Watch for successful blockchain confirmation and save to backend
  useEffect(() => {
    console.log("🔄 Backend save useEffect triggered. State:", {
      isSuccess,
      hash,
      proposalId,
      spaceId
    });

    const saveToBackend = async () => {
      if (isSuccess && hash && proposalId !== null && spaceId) {
        // Prevent duplicate saves for the same transaction
        if (processedTxs.current.has(hash)) return;
        processedTxs.current.add(hash);

        console.log("✅ All conditions met! Saving to backend...");
        console.log("📝 Proposal data:", {
          title,
          description,
          voting_type: votingType,
          options: options.filter((o) => o.trim() !== ""),
          blockchain_proposal_id: proposalId,
          blockchain_tx_hash: hash,
        });

        try {
          const { proposalApi } = await import("@/app/services/proposalApi");
          const { HASH_OPTIMIZED_CONTRACT_ADDRESS } = await import("@/app/contracts/proposalHashOptimized");

          console.log("📡 Calling proposalApi.createProposal...");

          const result = await proposalApi.createProposal(spaceId, {
            title,
            description,
            voting_type: votingType,
            options: options.filter((o) => o.trim() !== ""),
            start_date: startDate || undefined,
            end_date: endDate,
            blockchain_proposal_id: proposalId,
            blockchain_tx_hash: hash,
            contract_address: HASH_OPTIMIZED_CONTRACT_ADDRESS,
            use_blockchain: true,
            blockchain_verified: true
          });

          console.log("✅ Backend save successful!", result);
          addToast("✅ Proposal created and saved successfully!", "success", 4000);

          // Reset form or call onSubmit callback
          onSubmit?.({
            title,
            description,
            votingType,
            options: options.filter((o) => o.trim() !== ""),
            startDate,
            endDate,
          });
        } catch (err: any) {
          console.error("❌ Failed to save to backend:", err);
          console.error("Error details:", err.response || err);
          addToast(`⚠️ Blockchain success but backend save failed: ${err.message}`, "error", 6000);
        } finally {
          setIsSubmitting(false);
        }
      } else {
        console.log("⏸️ Backend save skipped. Missing:", {
          isSuccess: !isSuccess,
          hash: !hash,
          proposalId: proposalId === null,
          spaceId: !spaceId
        });
      }
    };

    saveToBackend();
  }, [isSuccess, hash, proposalId, spaceId]);

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!spaceId) {
      const msg = "Select a space before creating a proposal.";
      setSubmitError(msg);
      addToast(msg, "error", 3000);
      return;
    }

    const payload: ProposalData = {
      title,
      description,
      votingType,
      options: options.filter((o) => o.trim() !== ""),
      startDate,
      endDate,
    };

    if (payload.options.length < 2) {
      const msg = "Add at least two options.";
      setSubmitError(msg);
      addToast(msg, "error", 3000);
      return;
    }

    // Calculate duration in days
    const start = new Date();
    const end = new Date(payload.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (durationDays < 1) {
      const msg = "Duration must be at least 1 day.";
      setSubmitError(msg);
      addToast(msg, "error", 3000);
      return;
    }

    const loadingToastId = addToast("📝 Check your wallet to confirm transaction...", "loading", 0);
    setIsSubmitting(true);

    try {
      const tx = await createProposal(
        payload.title,
        payload.description,
        payload.options,
        durationDays
      );

      removeToast(loadingToastId);
      addToast("⏳ Transaction submitted! Waiting for blockchain confirmation...", "info", 0);

      // The useEffect above will handle saving to backend once confirmed
    } catch (err: any) {
      removeToast(loadingToastId);
      const errMsg = err.message || "Failed to create proposal on chain.";
      setSubmitError(errMsg);
      addToast(errMsg, "error", 4000);
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = title.trim().length >= 5;
  const isStep2Valid = options.filter((o) => o.trim() !== "").length >= 2;
  const isStep3Valid = startDate && endDate && new Date(endDate) > new Date(startDate);

  return (
    <>
      <Toast toasts={toasts} onClose={removeToast} />
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-base-bg dark:bg-dark-bg border-b border-base-border dark:border-dark-border">
          <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4">
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-base-bg-secondary dark:hover:bg-dark-border transition-colors"
            >
              <ArrowBackOutline width="22px" height="22px" color="currentColor" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-base-text dark:text-dark-text">New Proposal</h1>
              <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
                {spaceName} - Step {step} of 3
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2 px-4 md:px-6 pb-3 md:pb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-base-border dark:bg-dark-border"
                  }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-5 md:py-8">
          {/* Step 1: Title & Description */}
          {step === 1 && (
            <div className="space-y-5 md:space-y-6">
              <div className="text-center mb-5 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-base-text dark:text-dark-text mb-2">
                  What&apos;s your proposal about?
                </h2>
                <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
                  Write a clear title and description for your proposal
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a clear, concise title"
                  className="w-full px-4 py-3 bg-base-bg-secondary dark:bg-dark-border rounded-xl border border-base-border dark:border-dark-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm md:text-base text-base-text dark:text-dark-text placeholder:text-base-text-secondary/50 transition-all"
                  maxLength={100}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                    Minimum 5 characters
                  </p>
                  <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                    {title.length}/100
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide more context about your proposal. What problem does it solve? What are the expected outcomes?"
                  rows={5}
                  className="w-full px-4 py-3 bg-base-bg-secondary dark:bg-dark-border rounded-xl border border-base-border dark:border-dark-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm md:text-base text-base-text dark:text-dark-text placeholder:text-base-text-secondary/50 transition-all resize-none"
                  maxLength={2000}
                />
                <div className="flex justify-end mt-2">
                  <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                    {description.length}/2000
                  </p>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className="w-full py-3 md:py-3.5 bg-primary hover:bg-primary-hover disabled:bg-base-bg-secondary disabled:dark:bg-dark-border disabled:text-base-text-secondary text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed text-sm md:text-base"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Voting Options */}
          {step === 2 && (
            <div className="space-y-5 md:space-y-6">
              <div className="text-center mb-5 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-base-text dark:text-dark-text mb-2">
                  Set up voting options
                </h2>
                <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
                  Choose voting type and add options for members to vote on
                </p>
              </div>

              {/* Voting Type */}
              <div>
                <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-3">
                  Voting Type
                </label>
                <div className="space-y-2 md:space-y-3">
                  {votingTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => !type.disabled && setVotingType(type.id as "single" | "multiple" | "weighted")}
                      disabled={type.disabled}
                      className={`w-full p-3 md:p-4 rounded-xl border-2 transition-all flex items-center gap-3 md:gap-4 ${votingType === type.id
                        ? "border-primary bg-primary/5"
                        : type.disabled
                          ? "border-base-border dark:border-dark-border bg-gray-50 dark:bg-gray-900/20 opacity-60 cursor-not-allowed"
                          : "border-base-border dark:border-dark-border hover:border-primary/50"
                        }`}
                    >
                      <div
                        className={`size-5 md:size-6 rounded-full border-2 flex items-center justify-center transition-colors ${votingType === type.id
                          ? "border-primary bg-primary"
                          : "border-base-border dark:border-dark-border"
                          }`}
                      >
                        {votingType === type.id && (
                          <CheckmarkCircleOutline width="14px" height="14px" color="white" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm md:text-base text-base-text dark:text-dark-text">
                          {type.name}
                        </p>
                        <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-3">
                  Options <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 md:space-y-3">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="w-full px-4 py-2.5 md:py-3 bg-base-bg-secondary dark:bg-dark-border rounded-xl border border-base-border dark:border-dark-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm md:text-base text-base-text dark:text-dark-text placeholder:text-base-text-secondary/50 transition-all"
                        />
                      </div>
                      {options.length > 2 && (
                        <button
                          onClick={() => removeOption(index)}
                          className="p-2 text-base-text-secondary hover:text-red-500 transition-colors"
                        >
                          <CloseOutline width="20px" height="20px" color="currentColor" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {options.length < 10 && (
                  <button
                    onClick={addOption}
                    className="mt-3 flex items-center gap-2 text-primary hover:text-primary-hover font-medium text-sm transition-colors"
                  >
                    <AddOutline width="18px" height="18px" color="currentColor" />
                    Add Option
                  </button>
                )}
                <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary mt-2">
                  Minimum 2 options required, maximum 10
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 md:py-3.5 bg-base-bg-secondary dark:bg-dark-border text-base-text dark:text-dark-text font-semibold rounded-xl hover:bg-base-border dark:hover:bg-dark-border/80 transition-colors text-sm md:text-base"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!isStep2Valid}
                  className="flex-1 py-3 md:py-3.5 bg-primary hover:bg-primary-hover disabled:bg-base-bg-secondary disabled:dark:bg-dark-border disabled:text-base-text-secondary text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed text-sm md:text-base"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Duration */}
          {step === 3 && (
            <div className="space-y-5 md:space-y-6">
              <div className="text-center mb-5 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-base-text dark:text-dark-text mb-2">
                  Set voting duration
                </h2>
                <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
                  Choose when voting starts and ends
                </p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarOutline
                      width="18px"
                      height="18px"
                      color="currentColor"
                      cssClasses="absolute left-3 top-1/2 -translate-y-1/2 text-base-text-secondary pointer-events-none"
                    />
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-base-bg-secondary dark:bg-dark-border rounded-xl border border-base-border dark:border-dark-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm md:text-base text-base-text dark:text-dark-text transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CalendarOutline
                      width="18px"
                      height="18px"
                      color="currentColor"
                      cssClasses="absolute left-3 top-1/2 -translate-y-1/2 text-base-text-secondary pointer-events-none"
                    />
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-base-bg-secondary dark:bg-dark-border rounded-xl border border-base-border dark:border-dark-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm md:text-base text-base-text dark:text-dark-text transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 md:p-4 flex gap-3">
                <InformationCircleOutline width="20px" height="20px" color="#3b82f6" cssClasses="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs md:text-sm font-medium text-blue-800 dark:text-blue-200">
                    Proposal will be published immediately
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                    Once submitted, the proposal cannot be edited. Voting will begin at the start date.
                  </p>
                </div>
              </div>

              {/* Preview Card */}
              <div className="bg-white dark:bg-dark-bg-secondary rounded-xl md:rounded-2xl border border-base-border dark:border-dark-border p-4 md:p-5">
                <p className="text-xs font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide mb-3 md:mb-4">
                  Preview
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <DocumentTextOutline width="20px" height="20px" color="#6366f1" cssClasses="shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-sm md:text-base text-base-text dark:text-dark-text">
                        {title || "Your proposal title"}
                      </h3>
                      <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary line-clamp-2 mt-1">
                        {description || "Your proposal description will appear here"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {options.filter((o) => o.trim()).map((option, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-base-bg-secondary dark:bg-dark-border rounded-full text-xs font-medium text-base-text dark:text-dark-text"
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-base-text-secondary dark:text-dark-text-secondary pt-2 border-t border-base-border dark:border-dark-border mt-3">
                    <CalendarOutline width="14px" height="14px" color="currentColor" />
                    <span>
                      {startDate && endDate
                        ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                        : "Set voting duration"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 md:py-3.5 bg-base-bg-secondary dark:bg-dark-border text-base-text dark:text-dark-text font-semibold rounded-xl hover:bg-base-border dark:hover:bg-dark-border/80 transition-colors text-sm md:text-base"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!isStep3Valid || isSubmitting}
                  className="flex-1 py-3 md:py-3.5 bg-primary hover:bg-primary-hover disabled:bg-base-bg-secondary disabled:dark:bg-dark-border disabled:text-base-text-secondary text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {isSubmitting ? "Creating..." : "Create Proposal"}
                </button>
              </div>
              {submitError && (
                <p className="text-sm text-red-500 text-center mt-3">{submitError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
