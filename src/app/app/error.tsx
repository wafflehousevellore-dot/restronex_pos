"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RestroNex App Error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-[#172B25]">
      <div className="max-w-md w-full bg-white border border-[#E5EBE7] rounded-3xl p-8 text-center space-y-4 shadow-sm">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 grid place-items-center mx-auto text-2xl font-bold">
          <AlertCircle className="h-7 w-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-extrabold text-[#172B25]">Something Went Wrong</h2>
        <p className="text-sm text-[#718078] leading-relaxed">
          {error?.message || "An unexpected error occurred while loading this section."}
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-5 py-2.5 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Try Again
          </button>
          <Link
            href="/app/dashboard"
            className="rounded-full border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] text-[#172B25] px-5 py-2.5 text-xs font-semibold transition shadow-xs flex items-center gap-1.5"
          >
            <Home className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
