"use client";

import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: React.ReactNode;
}

export function ErrorState({
  title = "Unable to load data",
  message = "A temporary issue prevented this section from loading. Please try again.",
  onRetry,
  retryLabel = "Try Again",
  action,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-red-200 bg-red-50/40 p-6 text-center flex flex-col items-center justify-center my-4",
        className
      )}
      {...props}
    >
      <div className="h-11 w-11 rounded-2xl bg-red-100/80 border border-red-200 flex items-center justify-center text-red-600 mb-3 shadow-2xs">
        <AlertCircle className="h-5 w-5" />
      </div>

      <h3 className="text-sm font-bold text-red-950">{title}</h3>

      {message && (
        <p className="mt-1 text-xs text-red-800/80 max-w-md leading-relaxed">
          {message}
        </p>
      )}

      {(onRetry || action) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{retryLabel}</span>
            </button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}
