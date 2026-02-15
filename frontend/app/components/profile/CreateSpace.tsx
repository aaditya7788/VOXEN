"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowBackOutline,
  ImageOutline,
  GlobeOutline,
  LockClosedOutline,
  PeopleOutline,
  CheckmarkCircleOutline,
  InformationCircleOutline,
  SearchOutline
} from "react-ionicons";

interface SpaceData {
  id?: string;
  name: string;
  description: string;
  logo: string | null;
  category: string;
  visibility: "public" | "private";
  voting_strategy: string;
  username?: string;
  slug?: string;
}

interface CreateSpaceProps {
  onBack?: () => void;
  onCreateSpace?: (spaceData: SpaceData) => void;
  mode?: "create" | "edit";
  initialData?: SpaceData | null;
}

const CATEGORIES = [
  "General",
  "DeFi",
  "Gaming",
  "NFTs",
  "Social",
  "DAO",
  "Infrastructure",
  "Protocol",
  "Education",
  "Art",
  "Music"
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function CreateSpace({ onBack, onCreateSpace, mode = "create", initialData }: CreateSpaceProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [spaceName, setSpaceName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [votingStrategy, setVotingStrategy] = useState("one-person-one-vote");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (mode === "edit" && initialData) {
      setSpaceName(initialData.name || "");
      setUsername(initialData.username || initialData.slug || "");
      setDescription(initialData.description || "");
      setCategory(initialData.category || "General");
      setImagePreview(initialData.logo || null);
      setVisibility(initialData.visibility || "public");
      setVotingStrategy(initialData.voting_strategy || "one-person-one-vote");
    }
  }, [mode, initialData]);

  const filteredCategories = CATEGORIES.filter(c =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Image must be less than 2MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("voxen_token");

      if (!token) {
        setError("Please sign in to continue");
        return;
      }

      const spaceData = {
        name: spaceName.trim(),
        description: description.trim(),
        logo: imagePreview,
        category,
        username: username.trim(),
        visibility,
        voting_strategy: votingStrategy,
      };

      const url = mode === "edit" && initialData?.id
        ? `${API_URL}/spaces/${initialData.id}`
        : `${API_URL}/spaces`;

      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(spaceData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || `Failed to ${mode} space`);
        return;
      }

      // Success logic
      const resultSpace = data.data;

      // Update cache logic
      try {
        const cached = localStorage.getItem("voxen_user_spaces");
        let spaces = cached ? JSON.parse(cached) : [];

        if (mode === "create") {
          const newSpace = {
            id: resultSpace.id,
            name: resultSpace.name,
            slug: resultSpace.slug,
            logo: resultSpace.logo || null,
            user_role: "owner",
            username: resultSpace.username || null,
            invite_token: resultSpace.invite_token || null,
          };
          spaces.unshift(newSpace);
        } else {
          // Edit mode - update existing space in cache
          spaces = spaces.map((s: any) => {
            // Check by ID or slug/username
            if (s.id === resultSpace.id || s.slug === initialData?.slug) {
              return {
                ...s,
                name: resultSpace.name,
                slug: resultSpace.slug,
                logo: resultSpace.logo,
                username: resultSpace.username
              };
            }
            return s;
          });
        }
        localStorage.setItem("voxen_user_spaces", JSON.stringify(spaces));
      } catch (cacheError) {
        console.error("Failed to update local cache:", cacheError);
      }

      // Call callback
      onCreateSpace?.({
        ...resultSpace,
        logo: resultSpace.logo || imagePreview,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || `Failed to ${mode} space`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = spaceName.trim().length >= 3;
  const isUsernameValid = username.trim().length >= 3;
  const isStep1ValidCombined = isStep1Valid && isUsernameValid && category;
  const isStep2Valid = description.trim().length >= 10;

  if (isSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="size-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
          <CheckmarkCircleOutline width="48px" height="48px" color="currentColor" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-base-text dark:text-dark-text">Space {mode === "edit" ? "Updated" : "Created"}!</h2>
          <p className="text-base-text-secondary dark:text-dark-text-secondary">
            Your community <strong>{spaceName}</strong> has been {mode === "edit" ? "updated" : "created"}.
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-8 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors"
        >
          Back to Space
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-base-bg dark:bg-dark-bg border-b border-base-border dark:border-dark-border">
        <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-base-bg-secondary dark:hover:bg-dark-border transition-colors"
          >
            <ArrowBackOutline width="24px" height="24px" color="currentColor" />
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-base-text dark:text-dark-text">
              {mode === "edit" ? "Update Space" : "Create a Space"}
            </h1>
            <p className="text-xs md:text-sm text-base-text-secondary dark:text-dark-text-secondary">
              Step {step} of 3
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
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-base-text dark:text-dark-text mb-2">
                {mode === "edit" ? "Update basics" : "Let's start with the basics"}
              </h2>
              <p className="text-sm md:text-base text-base-text-secondary dark:text-dark-text-secondary">
                {mode === "edit" ? "Update your space name, logo or category" : "Give your space a name, logo and category"}
              </p>
            </div>

            {/* Logo Upload */}
            <div className="flex flex-col items-center gap-4">
              <label className="cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Space logo"
                      className="size-24 md:size-32 rounded-2xl object-cover ring-4 ring-primary/20"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageOutline width="32px" height="32px" color="white" />
                    </div>
                  </div>
                ) : (
                  <div className="size-24 md:size-32 rounded-2xl border-2 border-dashed border-base-border dark:border-dark-border bg-base-bg-secondary dark:bg-dark-border flex flex-col items-center justify-center gap-2 group-hover:border-primary active:border-primary group-hover:bg-primary/5 active:bg-primary/5 transition-colors">
                    <ImageOutline width="32px" height="32px" color="currentColor" />
                    <span className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                      Upload logo
                    </span>
                  </div>
                )}
              </label>
              <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                Recommended: 256x256px or larger
              </p>
            </div>

            {/* Space Name */}
            <div>
              <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-2">
                Space Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder="Enter your space name"
                className="w-full px-4 py-3 bg-base-bg-secondary dark:bg-dark-border rounded-xl border border-base-border dark:border-dark-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base text-base-text dark:text-dark-text placeholder:text-base-text-secondary/50 dark:placeholder:text-dark-text-secondary/50 transition-all"
                maxLength={50}
              />
              <div className="flex justify-between mt-2">
                <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                  Minimum 3 characters
                </p>
                <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                  {spaceName.length}/50
                </p>
              </div>
            </div>

            {/* Username (invite handle) */}
            <div>
              <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-2">
                Username (for invite link) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. my-space or community123"
                className="w-full px-4 py-3 bg-base-bg-secondary dark:bg-dark-border rounded-xl border border-base-border dark:border-dark-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base text-base-text dark:text-dark-text placeholder:text-base-text-secondary/50 dark:placeholder:text-dark-text-secondary/50 transition-all"
                maxLength={30}
              />
              <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary mt-2">This will be used as the invite handle: https://voxen.xyz/invite/&lt;username&gt;</p>
            </div>

            {/* Category selection */}
            <div className="relative">
              <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <div
                className="w-full px-4 py-3 bg-base-bg-secondary dark:bg-dark-border rounded-xl border border-base-border dark:border-dark-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all cursor-pointer flex items-center justify-between"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <span className={category ? "text-base-text dark:text-dark-text" : "text-base-text-secondary/50"}>
                  {category || "Select a category"}
                </span>
                <SearchOutline width="18px" height="18px" color="currentColor" />
              </div>

              {showCategoryDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white dark:bg-dark-bg-secondary border border-base-border dark:border-dark-border rounded-xl shadow-xl z-20">
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Search categories..."
                    className="w-full px-3 py-2 bg-base-bg-secondary dark:bg-dark-border rounded-lg border border-base-border dark:border-dark-border outline-none text-sm mb-2"
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto no-scrollbar">
                    {filteredCategories.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setCategory(c);
                          setShowCategoryDropdown(false);
                          setCategorySearch("");
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${category === c
                          ? "bg-primary text-white"
                          : "hover:bg-base-bg-secondary dark:hover:bg-dark-border text-base-text dark:text-dark-text"
                          }`}
                      >
                        {c}
                      </button>
                    ))}
                    {filteredCategories.length === 0 && (
                      <p className="text-xs text-center py-2 text-base-text-secondary">No matching categories</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!isStep1ValidCombined}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover disabled:bg-base-bg-secondary disabled:dark:bg-dark-border disabled:text-base-text-secondary disabled:dark:text-dark-text-secondary text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Description */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-base-text dark:text-dark-text mb-2">
                {mode === "edit" ? "Update details" : "Tell us about your space"}
              </h2>
              <p className="text-sm md:text-base text-base-text-secondary dark:text-dark-text-secondary">
                {mode === "edit" ? "Update your space description or visibility" : "A good description helps members understand your community"}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is your space about? What kind of proposals will be created here?"
                rows={5}
                className="w-full px-4 py-3 bg-base-bg-secondary dark:bg-dark-border rounded-xl border border-base-border dark:border-dark-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-base text-base-text dark:text-dark-text placeholder:text-base-text-secondary/50 dark:placeholder:text-dark-text-secondary/50 transition-all resize-none"
                maxLength={500}
              />
              <div className="flex justify-between mt-2">
                <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                  Minimum 10 characters
                </p>
                <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                  {description.length}/500
                </p>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-3">
                Visibility
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setVisibility("public")}
                  className={`p-4 rounded-xl border-2 transition-all ${visibility === "public"
                    ? "border-primary bg-primary/5"
                    : "border-base-border dark:border-dark-border hover:border-primary/50"
                    }`}
                >
                  <GlobeOutline
                    width="24px"
                    height="24px"
                    color={visibility === "public" ? "#0052FF" : "currentColor"}
                  />
                  <p className="font-semibold text-base-text dark:text-dark-text mt-2">Public</p>
                  <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                    Anyone can view and join
                  </p>
                </button>
                <button
                  disabled
                  className="p-4 rounded-xl border-2 border-base-border dark:border-dark-border opacity-50 cursor-not-allowed text-left transition-all"
                >
                  <LockClosedOutline
                    width="24px"
                    height="24px"
                    color="currentColor"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <p className="font-semibold text-base-text dark:text-dark-text">Private</p>
                    <span className="text-[10px] bg-base-bg-secondary dark:bg-dark-border text-base-text-secondary px-1.5 py-0.5 rounded-md font-bold uppercase">
                      Soon
                    </span>
                  </div>
                  <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                    Invite only access
                  </p>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3.5 bg-base-bg-secondary dark:bg-dark-border text-base-text dark:text-dark-text font-semibold rounded-xl hover:bg-base-border dark:hover:bg-dark-border/80 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!isStep2Valid}
                className="flex-1 py-3.5 bg-primary hover:bg-primary-hover disabled:bg-base-bg-secondary disabled:dark:bg-dark-border disabled:text-base-text-secondary disabled:dark:text-dark-text-secondary text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Voting Settings */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-xl md:text-2xl font-bold text-base-text dark:text-dark-text mb-2">
                {mode === "edit" ? "Update voting config" : "Configure voting"}
              </h2>
              <p className="text-sm md:text-base text-base-text-secondary dark:text-dark-text-secondary">
                Choose how voting power is distributed
              </p>
            </div>

            {/* Voting Strategy */}
            <div>
              <label className="block text-sm font-semibold text-base-text dark:text-dark-text mb-3">
                Voting Strategy
              </label>
              <div className="space-y-3">
                {[
                  {
                    id: "token-weighted",
                    name: "Token Weighted",
                    description: "Voting power based on token holdings",
                    icon: <WalletOutline width="24px" height="24px" color="currentColor" />,
                    disabled: true
                  },
                  {
                    id: "one-person-one-vote",
                    name: "One Person One Vote",
                    description: "Each member gets exactly one vote",
                    icon: <PeopleOutline width="24px" height="24px" color="currentColor" />,
                    disabled: false
                  },
                  {
                    id: "quadratic",
                    name: "Quadratic Voting",
                    description: "Cost increases quadratically with votes",
                    icon: <CheckmarkCircleOutline width="24px" height="24px" color="currentColor" />,
                    disabled: true
                  },
                ].map((strategy) => (
                  <button
                    key={strategy.id}
                    type="button"
                    onClick={() => !strategy.disabled && setVotingStrategy(strategy.id)}
                    disabled={strategy.disabled}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${strategy.disabled
                      ? "opacity-50 cursor-not-allowed border-base-border dark:border-dark-border"
                      : votingStrategy === strategy.id
                        ? "border-primary bg-primary/5"
                        : "border-base-border dark:border-dark-border hover:border-primary/50"
                      }`}
                  >
                    <div
                      className={`size-12 rounded-full flex items-center justify-center ${votingStrategy === strategy.id && !strategy.disabled
                        ? "bg-primary text-white"
                        : "bg-base-bg-secondary dark:bg-dark-border text-base-text-secondary"
                        }`}
                    >
                      {strategy.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-base-text dark:text-dark-text">
                          {strategy.name}
                        </p>
                        {strategy.disabled && (
                          <span className="text-[10px] bg-base-bg-secondary dark:bg-dark-border text-base-text-secondary px-1.5 py-0.5 rounded-md font-bold uppercase">
                            Soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-base-text-secondary dark:text-dark-text-secondary">
                        {strategy.description}
                      </p>
                    </div>
                    {votingStrategy === strategy.id && !strategy.disabled && (
                      <CheckmarkCircleOutline width="24px" height="24px" color="#0052FF" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
              <InformationCircleOutline width="24px" height="24px" color="#3b82f6" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  You can change this later
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  Voting settings can be modified in space settings after creation.
                </p>
              </div>
            </div>

            {/* Preview Card */}
            <div className="bg-white dark:bg-dark-bg-secondary rounded-2xl border border-base-border dark:border-dark-border p-5">
              <p className="text-xs font-semibold text-base-text-secondary dark:text-dark-text-secondary uppercase tracking-wide mb-4">
                Preview
              </p>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <img src={imagePreview} alt="Space" className="size-16 rounded-xl object-cover" />
                ) : (
                  <div className="size-16 rounded-xl bg-gradient-to-br from-primary to-blue-400" />
                )}
                <div>
                  <h3 className="font-bold text-base-text dark:text-dark-text">
                    {spaceName || "Your Space"}
                  </h3>
                  <p className="text-sm text-base-text-secondary dark:text-dark-text-secondary line-clamp-2">
                    {description || "Your space description will appear here"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {visibility === "public" ? (
                      <GlobeOutline width="14px" height="14px" color="currentColor" />
                    ) : (
                      <LockClosedOutline width="14px" height="14px" color="currentColor" />
                    )}
                    <span className="text-xs text-base-text-secondary dark:text-dark-text-secondary capitalize">
                      {visibility}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-base-bg-secondary dark:bg-dark-border text-base-text dark:text-dark-text font-semibold rounded-xl hover:bg-base-border dark:hover:bg-dark-border/80 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{mode === "edit" ? "Updating..." : "Creating..."}</span>
                  </>
                ) : (
                  <>{mode === "edit" ? "Update Space" : "Create Space"}</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WalletOutline({ width, height, color }: { width: string; height: string; color: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 512 512" fill="none" stroke={color} strokeWidth="32">
      <rect x="48" y="144" width="416" height="288" rx="48" ry="48" />
      <path d="M411.36 144v-30A50 50 0 00352 64H100.36A50 50 0 0050 114v30" />
      <circle cx="368" cy="288" r="32" fill={color} />
    </svg>
  );
}
