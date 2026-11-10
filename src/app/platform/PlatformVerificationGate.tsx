"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReverification, useClerk } from "@clerk/nextjs";
import { ShieldAlert, ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlatformVerificationGate({
  reason,
  message,
  requireMfaLevel,
}: {
  reason: "MFA_REQUIRED" | "REVERIFICATION_REQUIRED";
  message: string;
  requireMfaLevel: boolean;
}) {
  const router = useRouter();
  const { signOut } = useClerk();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performReverification = useReverification(
    async () => {
      return { ok: true };
    },
    {
      level: requireMfaLevel ? "second_factor" : "first_factor",
      afterMinutes: 1,
    } as any
  );

  async function handleVerify() {
    setVerifying(true);
    setError(null);
    try {
      await performReverification();
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Verification cancelled or failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#172B25] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl border border-[#E5EBE7] bg-white p-8 shadow-sm space-y-5 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <span className="inline-block rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-[11px] font-bold text-amber-800 uppercase">
            {reason === "MFA_REQUIRED" ? "2FA Verification Required" : "Step-Up Verification Required"}
          </span>
          <h1 className="mt-3 text-xl font-black text-[#172B25]">Platform Owner Verification</h1>
          <p className="mt-2 text-xs text-[#718078] leading-relaxed">{message}</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          <Button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white font-bold text-xs py-3 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            {verifying ? "Opening Clerk Verification..." : "Verify with Clerk MFA / OTP"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => signOut({ redirectUrl: "/sign-in?next=/platform" })}
            className="w-full rounded-full border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] text-xs font-semibold py-2.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out & Re-Authenticate
          </Button>
        </div>
      </div>
    </div>
  );
}
