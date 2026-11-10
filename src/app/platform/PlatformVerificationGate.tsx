"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReverification, useClerk } from "@clerk/nextjs";
import { ShieldAlert, ShieldCheck, KeyRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlatformVerificationGate({
  reason,
  message,
  requireMfaLevel,
}: {
  reason: "TOTP_REQUIRED" | "MFA_REQUIRED" | "REVERIFICATION_REQUIRED";
  message: string;
  requireMfaLevel: boolean;
}) {
  const router = useRouter();
  const { signOut } = useClerk();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [useBackupMode, setUseBackupMode] = useState(false);

  const performReverification = useReverification(
    async () => {
      return { ok: true };
    },
    {
      level: requireMfaLevel ? "second_factor" : "first_factor",
      afterMinutes: 1,
    } as any
  );

  async function handleClerkReverify() {
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

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter your verification code.");
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Invalid verification code.");
      }
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#172B25] flex items-center justify-center p-4">
      <div className="max-w-md w-full rounded-3xl border border-[#E5EBE7] bg-white p-8 shadow-sm space-y-5 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
          {reason === "TOTP_REQUIRED" ? (
            <KeyRound className="h-6 w-6" />
          ) : (
            <ShieldAlert className="h-6 w-6" />
          )}
        </div>
        <div>
          <span className="inline-block rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3 py-0.5 text-[11px] font-bold text-[#16845B] uppercase">
            {reason === "TOTP_REQUIRED"
              ? "Authenticator 2FA Required"
              : reason === "MFA_REQUIRED"
                ? "2FA Verification Required"
                : "Step-Up Verification Required"}
          </span>
          <h1 className="mt-3 text-xl font-black text-[#172B25]">Platform Owner Verification</h1>
          <p className="mt-2 text-xs text-[#718078] leading-relaxed">{message}</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {reason === "TOTP_REQUIRED" ? (
          <form onSubmit={handleTotpSubmit} className="space-y-3 text-left">
            <div>
              <label
                htmlFor="platform-totp-code"
                className="block text-[11px] font-bold text-[#718078] uppercase tracking-wider mb-1.5"
              >
                {useBackupMode ? "8-Character Backup Recovery Code" : "6-Digit Authenticator App Code"}
              </label>
              <input
                id="platform-totp-code"
                type="text"
                autoFocus
                inputMode={useBackupMode ? "text" : "numeric"}
                autoComplete="one-time-code"
                placeholder={useBackupMode ? "ABCD-EFGH" : "000000"}
                maxLength={useBackupMode ? 12 : 6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.25em] text-[#172B25] focus:border-[#16845B] focus:bg-white focus:outline-none"
              />
            </div>

            <Button
              type="submit"
              disabled={verifying}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white font-bold text-xs py-3 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              {verifying ? "Verifying Code..." : "Unlock Platform Admin"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setUseBackupMode(!useBackupMode);
                setCode("");
                setError(null);
              }}
              className="w-full text-center text-xs font-semibold text-[#16845B] hover:underline py-1 cursor-pointer"
            >
              {useBackupMode
                ? "Use 6-digit Authenticator App code instead"
                : "Lost your phone? Use a backup recovery code"}
            </button>
          </form>
        ) : (
          <div className="space-y-2.5 pt-2">
            <Button
              type="button"
              onClick={handleClerkReverify}
              disabled={verifying}
              className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white font-bold text-xs py-3 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              {verifying ? "Opening Clerk Verification..." : "Verify with Clerk MFA / Email OTP"}
            </Button>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => signOut({ redirectUrl: "/sign-in?next=/platform" })}
          className="w-full rounded-full border-[#E5EBE7] bg-white text-[#718078] hover:text-[#172B25] text-xs font-semibold py-2.5 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out &amp; Re-Authenticate
        </Button>
      </div>
    </div>
  );
}
