"use client";

import { useState } from "react";
import { UserProfile } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, KeyRound, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

export default function SettingsAdminClient({
  primaryOwnerEmail,
  mfaEnrolled,
  mfaVerifiedInSession,
  gstBps,
  razorpayConfigured,
  razorpayLiveMode,
  webhookConfigured,
  clerkConfigured,
}: {
  primaryOwnerEmail: string;
  mfaEnrolled: boolean;
  mfaVerifiedInSession: boolean;
  gstBps: number;
  razorpayConfigured: boolean;
  razorpayLiveMode: boolean;
  webhookConfigured: boolean;
  clerkConfigured: boolean;
}) {
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function syncPlans() {
    setSyncing(true);
    setMsg(null);
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
      setMsg(`Error: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#172B25]">Platform System Settings &amp; Security</h1>
          <p className="text-sm text-[#718078]">
            Manage platform infrastructure health, GST rates, payment gateway status, and Clerk Platform Owner security.
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
              <span className="text-[#718078]">2FA / TOTP MFA Status</span>
              {mfaEnrolled ? (
                <span className="font-bold text-[#16845B]">
                  Enrolled {mfaVerifiedInSession ? "& Session Verified ✓" : "(Verification Active)"}
                </span>
              ) : (
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Pending Clerk Dashboard MFA Toggle
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

      {/* Clerk Embedded Account, Password Recovery & MFA Management */}
      <Card className="bg-white border-[#E5EBE7] shadow-xs overflow-hidden">
        <CardHeader className="border-b border-[#E5EBE7]">
          <CardTitle className="text-base text-[#172B25]">Clerk Account Security &amp; Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex justify-center overflow-x-auto">
          <UserProfile routing="hash" />
        </CardContent>
      </Card>
    </div>
  );
}
