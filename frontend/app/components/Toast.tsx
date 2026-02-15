"use client";
import { CheckmarkCircleOutline, CloseCircleOutline, InformationCircleOutline, CloseOutline } from "react-ionicons";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "loading";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function Toast({ toasts, onClose }: ToastProps) {
  return (
    <div className="fixed bottom-4 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration === 0) return;
    const duration = toast.duration || 3000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const getStyles = () => {
    const base =
      "pointer-events-auto px-4 md:px-6 py-3 md:py-4 rounded-lg border flex items-start gap-3 md:gap-4 max-w-sm animate-in slide-in-from-bottom-4 duration-300 transition-all";
    const transition = isExiting ? "animate-out slide-out-to-bottom-4 duration-300" : "";

    switch (toast.type) {
      case "success":
        return `${base} ${transition} bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-200`;
      case "error":
        return `${base} ${transition} bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200`;
      case "info":
        return `${base} ${transition} bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-200`;
      case "loading":
        return `${base} ${transition} bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-200`;
      default:
        return base;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckmarkCircleOutline width="20px" height="20px" color="currentColor" className="flex-shrink-0 mt-0.5" />;
      case "error":
        return <CloseCircleOutline width="20px" height="20px" color="currentColor" className="flex-shrink-0 mt-0.5" />;
      case "info":
        return <InformationCircleOutline width="20px" height="20px" color="currentColor" className="flex-shrink-0 mt-0.5" />;
      case "loading":
        return (
          <svg
            className="animate-spin flex-shrink-0 mt-0.5"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={getStyles()}>
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm md:text-base font-medium">{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onClose(toast.id);
            }}
            className="inline-block mt-2 text-xs md:text-sm font-semibold underline hover:no-underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(toast.id), 300);
        }}
        className="flex-shrink-0 p-1 hover:opacity-75 transition-opacity"
      >
        <CloseOutline width="18px" height="18px" color="currentColor" />
      </button>
    </div>
  );
}
