"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-[#E3EBE6] shadow-xl shadow-black/5 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0F1E19]">Application Notice</h2>
        <p className="text-sm text-[#4A5D55] mt-2">
          A temporary service issue occurred while loading this page.
        </p>
        {error?.digest && (
          <p className="text-xs text-[#8A9C93] font-mono mt-1">
            Reference: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 bg-[#16845B] hover:bg-[#126B49] text-white font-semibold py-2.5 px-4 rounded-xl transition text-sm shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            Reload Page
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-[#F0F5F2] hover:bg-[#E3EBE6] text-[#0F1E19] font-semibold py-2.5 px-4 rounded-xl transition text-sm"
          >
            <Home className="w-4 h-4" />
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
