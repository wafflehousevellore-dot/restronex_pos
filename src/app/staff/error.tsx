"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, LogIn } from "lucide-react";

export default function StaffError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Staff Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-[#E3EBE6] shadow-xl shadow-black/5 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0F1E19]">Station Connection Notice</h2>
        <p className="text-sm text-[#4A5D55] mt-2">
          An unexpected error occurred while loading this staff workspace view.
        </p>
        {error?.digest && (
          <p className="text-xs text-[#8A9C93] font-mono mt-1">
            Reference Code: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 bg-[#16845B] hover:bg-[#126B49] text-white font-semibold py-2.5 px-4 rounded-xl transition text-sm shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            Reload Station
          </button>
          <Link
            href="/staff/login"
            className="inline-flex items-center justify-center gap-2 bg-[#F0F5F2] hover:bg-[#E3EBE6] text-[#0F1E19] font-semibold py-2.5 px-4 rounded-xl transition text-sm"
          >
            <LogIn className="w-4 h-4" />
            Return to Staff Login
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 text-xs text-[#6F8279] hover:text-[#0F1E19] transition pt-2"
          >
            <Home className="w-3.5 h-3.5" />
            Back to RestroNex Home
          </Link>
        </div>
      </div>
    </div>
  );
}
