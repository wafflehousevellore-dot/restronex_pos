"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserProfile } from "@clerk/nextjs";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  Smartphone,
  Copy,
  Download,
  Lock,
  ShieldOff,
} from "lucide-react";

type SetupPayload = {
  otpauthUrl: string;
  manualKey: string;
  issuer: string;
  accountEmail: string;
};

export default function SettingsAdminClient({
  primaryOwnerEmail,
  mfaEnrolled,
  mfaVerifiedInSession,
  totpEnabled,
  clerkMfaEnrolled,
  totpEnrolledAt,
  totpLastVerifiedAt,
  remainingBackupCodes,
  gstBps,
  razorpayConfigured,
  razorpayLiveMode,
  webhookConfigured,
  clerkConfigured,
}: {
  primaryOwnerEmail: string;
  mfaEnrolled: boolean;
  mfaVerifiedInSession: boolean;
  totpEnabled: boolean;
  clerkMfaEnrolled: boolean;
  totpEnrolledAt: string | null;
  totpLastVerifiedAt: string | null;
  remainingBackupCodes: number;
  gstBps: number;
  razorpayConfigured: boolean;
  razorpayLiveMode: boolean;
  webhookConfigured: boolean;
  clerkConfigured: boolean;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Free TOTP setup & management state
  const [busyTotp, setBusyTotp] = useState(false);
  const [setupData, setSetupData] = useState<SetupPayload | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [showDisableBox, setShowDisableBox] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  async function syncPlans() {
    setSyncing(true);
    setMsg(null);
    setErrMsg(null);
    try {
      const res = await fetch("/api/platform/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_PLANS" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Sync failed");
      setMsg("✓ Subscription plans synced cleanly and audit logged.");
    } catch (e: any) {
      setErrMsg(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function startTotpSetup() {
    setBusyTotp(true);
    setMsg(null);
    setErrMsg(null);
    setNewBackupCodes(null);
    setShowDisableBox(false);
    try {
      const res = await fetch("/api/platform/2fa/setup", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate QR setup");
      setSetupData(json);
      setConfirmCode("");
    } catch (e: any) {
      setErrMsg(e.message || "Failed to start Authenticator setup.");
    } finally {
      setBusyTotp(false);
    }
  }

  async function confirmTotpSetup(e: React.FormEvent) {
    e.preventDefault();
    setBusyTotp(true);
    setErrMsg(null);
    try {
      const res = await fetch("/api/platform/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: confirmCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Invalid verification code.");
      setSetupData(null);
      setConfirmCode("");
      setNewBackupCodes(json.backupCodes || []);
      setMsg("✓ Authenticator App 2FA activated. Save your recovery backup codes below.");
      router.refresh();
    } catch (e: any) {
      setErrMsg(e.message || "Confirmation failed.");
    } finally {
      setBusyTotp(false);
    }
  }

  async function disableTotp(e: React.FormEvent) {
    e.preventDefault();
    setBusyTotp(true);
    setErrMsg(null);
    try {
      const res = await fetch("/api/platform/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to disable 2FA.");
      setShowDisableBox(false);
      setDisableCode("");
      setNewBackupCodes(null);
      setMsg("Authenticator App 2FA has been disabled.");
      router.refresh();
    } catch (e: any) {
      setErrMsg(e.message || "Could not disable 2FA.");
    } finally {
      setBusyTotp(false);
    }
  }

  async function lockMfaSession() {
    setBusyTotp(true);
    setErrMsg(null);
    try {
      const res = await fetch("/api/platform/2fa/lock", { method: "POST" });
      if (!res.ok) throw new Error("Failed to lock session");
      router.refresh();
    } catch (e: any) {
      setErrMsg(e.message || "Failed to lock MFA session.");
      setBusyTotp(false);
    }
  }

  function copyManualKey() {
    if (!setupData?.manualKey) return;
    navigator.clipboard.writeText(setupData.manualKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function copyAllBackupCodes() {
    if (!newBackupCodes?.length) return;
    navigator.clipboard.writeText(newBackupCodes.join("\n"));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  }

  function downloadBackupCodes() {
    if (!newBackupCodes?.length) return;
    const text = [
      "RestroNex Platform Owner — Backup Recovery Codes",
      `Account: ${primaryOwnerEmail}`,
      `Generated: ${new Date().toISOString()}`,
      "Each code can be used ONCE if you lose access to your Authenticator App:",
      "",
      ...newBackupCodes,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "restronex-platform-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#172B25]">Platform System Settings &amp; Security</h1>
          <p className="text-sm text-[#718078]">
            Manage platform infrastructure health, GST rates, payment gateway status, and Platform Owner 2FA security.
          </p>
        </div>
        <Button
          onClick={syncPlans}
          disabled={syncing}
          className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-5 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
          Sync Plan Catalog
        </Button>
      </div>

      {msg && (
        <div className="rounded-xl border border-[#16845B]/30 bg-[#E8F5EE] p-3 text-xs font-semibold text-[#16845B]">
          {msg}
        </div>
      )}

      {errMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {errMsg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-base text-[#172B25] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#16845B]" />
              <span>Platform Owner Identity &amp; MFA Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-[#E5EBE7]">
              <span className="text-[#718078]">Primary PLATFORM_OWNER Email</span>
              <span className="font-bold text-[#172B25]">{primaryOwnerEmail}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E5EBE7]">
              <span className="text-[#718078]">Clerk Authentication</span>
              <span className="font-bold text-[#16845B] flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {clerkConfigured ? "Active & Enforced" : "Missing Keys"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E5EBE7]">
              <span className="text-[#718078]">Email Verification</span>
              <span className="font-bold text-[#16845B]">Verified ✓</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E5EBE7]">
              <span className="text-[#718078]">Authenticator 2FA (TOTP)</span>
              {totpEnabled ? (
                <span className="font-bold text-[#16845B]">
                  Active — RestroNex TOTP ✓ ({remainingBackupCodes} backup codes left)
                </span>
              ) : clerkMfaEnrolled ? (
                <span className="font-bold text-[#16845B]">
                  Active — Clerk MFA {mfaVerifiedInSession ? "✓" : ""}
                </span>
              ) : (
                <span className="font-bold text-[#16845B]">
                  Free TOTP Setup Ready Below ↓
                </span>
              )}
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#718078]">Password Recovery</span>
              <span className="font-semibold text-[#172B25]">Clerk Email OTP Reset Enabled ✓</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-base text-[#172B25] flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#16845B]" />
              <span>Billing, Tax &amp; Gateway Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-[#E5EBE7]">
              <span className="text-[#718078]">SaaS Subscription GST Rate</span>
              <span className="font-bold text-[#172B25]">{(gstBps / 100).toFixed(0)}% (CGST 9% + SGST 9%)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E5EBE7]">
              <span className="text-[#718078]">Razorpay API Credentials</span>
              <span className="font-bold text-[#16845B]">
                {razorpayConfigured ? (razorpayLiveMode ? "Live Production Mode ✓" : "Test Mode") : "Not Configured"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E5EBE7]">
              <span className="text-[#718078]">Razorpay HMAC Webhook Verification</span>
              <span className="font-bold text-[#16845B]">
                {webhookConfigured ? "Configured & Enforced ✓" : "Pending Secret"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#718078]">Public Admin Signup Creation</span>
              <span className="font-bold text-[#16845B]">Blocked Server-Side ✓</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Built-in Free Authenticator App 2FA (No Paid Clerk Pro Required) */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader className="border-b border-[#E5EBE7]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base text-[#172B25] flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-[#16845B]" />
              <span>Authenticator App 2FA (Google Authenticator / Authy)</span>
            </CardTitle>
            <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3 py-0.5 text-[11px] font-bold text-[#16845B]">
              {totpEnabled ? "2FA ENABLED ✓" : "100% FREE — NO CLERK PRO REQUIRED"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5 text-xs">
          {newBackupCodes && newBackupCodes.length > 0 && (
            <div className="rounded-2xl border border-[#16845B]/30 bg-[#E8F5EE]/70 p-4 space-y-3">
              <div className="font-bold text-sm text-[#172B25]">
                Save Your 8 One-Time Backup Recovery Codes
              </div>
              <p className="text-[#718078]">
                These codes are shown only once. Store them safely — each code lets you sign in if you lose your phone.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {newBackupCodes.map((bCode) => (
                  <div
                    key={bCode}
                    className="rounded-lg bg-white border border-[#E5EBE7] px-3 py-2 text-center font-mono font-bold text-[#172B25]"
                  >
                    {bCode}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyAllBackupCodes}
                  className="rounded-full border-[#E5EBE7] bg-white text-[#172B25] text-xs cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  {copiedBackup ? "Copied!" : "Copy All"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={downloadBackupCodes}
                  className="rounded-full border-[#E5EBE7] bg-white text-[#172B25] text-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download .txt
                </Button>
              </div>
            </div>
          )}

          {setupData ? (
            <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 inline-flex flex-col items-center gap-2">
                <QRCodeSVG value={setupData.otpauthUrl} size={176} level="M" includeMargin />
                <span className="text-[11px] text-[#718078] font-medium">
                  Scan with Google Authenticator or Authy
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="font-bold text-sm text-[#172B25]">
                    Step 1: Scan QR Code or Enter Key Manually
                  </div>
                  <p className="text-[#718078] mt-1">
                    Open Google Authenticator, Microsoft Authenticator, or Authy, tap <b>+</b> → <b>Scan a QR code</b>, or paste this key:
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3 py-2 font-mono font-bold text-xs text-[#172B25] select-all">
                      {setupData.manualKey}
                    </code>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={copyManualKey}
                      className="rounded-full border-[#E5EBE7] bg-white text-xs cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      {copiedKey ? "Copied" : "Copy Key"}
                    </Button>
                  </div>
                </div>

                <form onSubmit={confirmTotpSetup} className="space-y-3 max-w-xs">
                  <div>
                    <label
                      htmlFor="totp-confirm-input"
                      className="block font-bold text-sm text-[#172B25] mb-1"
                    >
                      Step 2: Enter the 6-Digit Code to Activate
                    </label>
                    <input
                      id="totp-confirm-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value)}
                      className="w-full rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-4 py-2.5 text-center font-mono text-base font-bold tracking-[0.25em] text-[#172B25] focus:border-[#16845B] focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={busyTotp}
                      className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-5 cursor-pointer"
                    >
                      {busyTotp ? "Activating..." : "Verify & Activate 2FA"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSetupData(null)}
                      className="rounded-full border-[#E5EBE7] text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : totpEnabled ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3">
                  <div className="text-[11px] text-[#718078]">Status</div>
                  <div className="font-bold text-[#16845B] mt-0.5">Protected by TOTP 2FA ✓</div>
                </div>
                <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3">
                  <div className="text-[11px] text-[#718078]">Enrolled Date</div>
                  <div className="font-semibold text-[#172B25] mt-0.5">
                    {totpEnrolledAt ? new Date(totpEnrolledAt).toLocaleDateString("en-IN") : "Active"}
                  </div>
                </div>
                <div className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] p-3">
                  <div className="text-[11px] text-[#718078]">Backup Codes Left</div>
                  <div className="font-semibold text-[#172B25] mt-0.5">
                    {remainingBackupCodes} unused{" "}
                    {totpLastVerifiedAt ? `· Last check ${new Date(totpLastVerifiedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Button
                  type="button"
                  onClick={lockMfaSession}
                  disabled={busyTotp}
                  className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-5 cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5 mr-1.5" />
                  Lock MFA Session Now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={startTotpSetup}
                  disabled={busyTotp}
                  className="rounded-full border-[#E5EBE7] bg-white text-[#172B25] text-xs font-semibold cursor-pointer"
                >
                  Re-Setup / New Device
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDisableBox(!showDisableBox)}
                  className="rounded-full border-red-200 bg-white text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                >
                  <ShieldOff className="h-3.5 w-3.5 mr-1.5" />
                  Disable 2FA
                </Button>
              </div>

              {showDisableBox && (
                <form
                  onSubmit={disableTotp}
                  className="rounded-2xl border border-red-200 bg-red-50/50 p-4 space-y-3 max-w-md"
                >
                  <div className="font-bold text-red-900">
                    Confirm 2FA Removal
                  </div>
                  <p className="text-[#718078]">
                    Enter a current 6-digit Authenticator code (or backup code) to disable Platform Owner 2FA:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      placeholder="123456 or ABCD-EFGH"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value)}
                      className="flex-1 min-w-[160px] rounded-xl border border-[#E5EBE7] bg-white px-3 py-2 font-mono text-xs font-bold text-[#172B25] focus:border-red-400 focus:outline-none"
                    />
                    <Button
                      type="submit"
                      disabled={busyTotp}
                      className="rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 cursor-pointer"
                    >
                      {busyTotp ? "Disabling..." : "Confirm Disable"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 max-w-xl">
                <div className="font-bold text-sm text-[#172B25]">
                  Add a free 6-digit Authenticator App lock to {primaryOwnerEmail}
                </div>
                <p className="text-[#718078] leading-relaxed">
                  Works with Google Authenticator, Microsoft Authenticator, Authy, 1Password, or Apple Passwords. Protected by AES-256-GCM encrypted secrets, replay-blocking, 5-attempt brute-force lockouts, and 8 single-use backup codes — completely free without Clerk Pro.
                </p>
              </div>
              <Button
                type="button"
                onClick={startTotpSetup}
                disabled={busyTotp}
                className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-6 py-2.5 cursor-pointer shrink-0"
              >
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                {busyTotp ? "Preparing QR..." : mfaEnrolled ? "Set Up Authenticator 2FA" : "Enable Free Authenticator 2FA"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clerk Embedded Account & Password Recovery Management */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs overflow-hidden">
        <CardHeader className="border-b border-[#E5EBE7]">
          <CardTitle className="text-base text-[#172B25]">Clerk Account, Password &amp; Email Sessions</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex justify-center overflow-x-auto">
          <UserProfile routing="hash" />
        </CardContent>
      </Card>
    </div>
  );
}
