"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Utensils, CheckCircle, AlertCircle, ArrowRight, ShieldCheck, Building2, User } from "lucide-react";
import { useUser, SignIn } from "@clerk/nextjs";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawToken = searchParams.get("token") || "";
  const { isSignedIn, user, isLoaded } = useUser();

  const [tokenInput, setTokenInput] = useState(rawToken);
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (rawToken) {
      verifyToken(rawToken);
    }
  }, [rawToken]);

  async function verifyToken(t: string) {
    if (!t.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/invitations?token=${encodeURIComponent(t.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to verify invitation token");
        setInvitation(null);
      } else {
        setInvitation(data);
      }
    } catch {
      setError("Network error while verifying invitation");
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    const tokenToUse = tokenInput.trim() || rawToken.trim();
    if (!tokenToUse) return;

    setAccepting(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToUse }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to accept invitation");
      } else {
        setSuccess(data.message || "Invitation accepted! Redirecting to workspace...");
        setTimeout(() => {
          router.push(data.redirectTo || "/staff/dashboard");
        }, 1200);
      }
    } catch {
      setError("Network error while accepting invitation");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/20 mb-4 shadow-sm">
          <Utensils className="w-7 h-7 text-[#16845B]" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F1E19]">
          Accept Team Invitation
        </h1>
        <p className="mt-2 text-sm text-[#4A5D55]">
          Join your restaurant team on RestroNex.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-black/5 sm:rounded-3xl sm:px-10 border border-[#E3EBE6]">
          {error && (
            <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to Process Invitation</p>
                <p className="mt-0.5 text-xs text-red-800">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/30 p-4 text-sm text-[#172B25] flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#16845B] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Invitation Accepted!</p>
                <p className="mt-0.5 text-xs text-[#2D5A47]">{success}</p>
              </div>
            </div>
          )}

          {!invitation && !loading && !rawToken && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyToken(tokenInput);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5D55] mb-1">
                  Invitation Token
                </label>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste your 64-character invite token..."
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D2DFD8] text-sm focus:border-[#16845B] focus:ring-2 focus:ring-[#16845B]/20 outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#16845B] hover:bg-[#126B49] text-white font-semibold py-2.5 px-4 rounded-xl transition duration-150 text-sm flex items-center justify-center gap-2"
              >
                Verify Invitation Token
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {loading && (
            <div className="py-8 text-center text-sm text-[#4A5D55]">
              Verifying invitation credentials...
            </div>
          )}

          {invitation && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-[#F8FAF9] p-4 border border-[#E3EBE6] space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#D2DFD8] flex items-center justify-center font-bold text-[#16845B]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0F1E19] text-base">
                      {invitation.tenantName}
                    </h3>
                    <p className="text-xs text-[#6F8279]">
                      Invited as <span className="font-semibold text-[#16845B]">{invitation.role}</span>
                    </p>
                  </div>
                </div>

                {invitation.outlets && invitation.outlets.length > 0 && (
                  <div className="pt-2 border-t border-[#E3EBE6] text-xs text-[#4A5D55]">
                    <span className="font-medium">Assigned Outlets: </span>
                    {invitation.outlets.join(", ")}
                  </div>
                )}
              </div>

              {isLoaded && !isSignedIn && (
                <div className="space-y-4">
                  <p className="text-xs text-[#4A5D55] text-center">
                    Please sign in or authenticate with Clerk to complete workspace activation:
                  </p>
                  <SignIn
                    routing="hash"
                    appearance={{
                      elements: {
                        card: "shadow-none border-0 p-0 w-full",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                      },
                    }}
                  />
                </div>
              )}

              {isLoaded && isSignedIn && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-[#4A5D55] bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <User className="w-4 h-4 text-[#16845B]" />
                    <span>Signed in as <b className="text-gray-900">{user?.primaryEmailAddress?.emailAddress}</b></span>
                  </div>

                  <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="w-full bg-[#16845B] hover:bg-[#126B49] text-white font-semibold py-3 px-4 rounded-xl transition duration-150 text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {accepting ? "Activating Workspace..." : "Accept & Enter Staff Workspace"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-[#EEF3F0] text-center">
            <Link
              href="/staff/login"
              className="text-xs font-semibold text-[#16845B] hover:underline"
            >
              Already have an active staff account? Sign In
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#6F8279]">
          <ShieldCheck className="w-4 h-4 text-[#16845B]" />
          <span>RestroNex Cryptographic Single-Use Invitation System</span>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center text-sm text-[#4A5D55]">Loading invitation...</div>}>
      <AcceptInvitationContent />
    </Suspense>
  );
}

