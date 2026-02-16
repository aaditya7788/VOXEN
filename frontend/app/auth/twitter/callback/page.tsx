"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function TwitterCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const error = searchParams.get("error");
        const success = searchParams.get("success");
        const handle = searchParams.get("handle");
        const age = searchParams.get("age");
        const isOldEnough = searchParams.get("isOldEnough") === "true";

        if (error) {
          setStatus("error");
          setMessage(error);
          return;
        }

        if (success && handle) {
          setStatus("success");
          const days = parseInt(age || "0");
          if (isOldEnough) {
            setMessage(`✅ Twitter account connected! @${handle} is verified (${days} days old)`);
          } else {
            const remaining = 180 - days;
            setMessage(`⏳ Twitter account connected! @${handle} needs ${remaining} more days to be eligible for KYC`);
          }

          // Redirect to frontend base URI after 3 seconds
          setTimeout(() => {
            router.push("/");
          }, 3000);
        }
      } catch (err: any) {
        console.error("Twitter callback error:", err);
        setStatus("error");
        setMessage("An unexpected error occurred");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Connecting your Twitter account...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Connected!</h1>
            <p className="text-gray-600 dark:text-gray-300">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting to profile...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Connection Failed</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{message}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:opacity-90"
            >
              Back to Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function TwitterCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <TwitterCallbackContent />
    </Suspense>
  );
}
