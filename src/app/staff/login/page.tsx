"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SignIn as ClerkSignIn, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { ShieldCheck, AlertCircle, Mail, UserCheck, Utensils } from "lucide-react";

function StaffLoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const error = searchParams.get("error");
  const next = searchParams.get("next") || "/staff/dashboard";

  // Automatically redirect already-authenticated staff members to their workspace callback
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace(`/staff/auth-callback?next=${encodeURIComponent(next)}`);
    }
  }, [isLoaded, isSignedIn, next, router]);

  if (isLoaded && isSignedIn) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center items-center py-12 px-4">
        <div className="w-12 h-12 border-4 border-[#16845B] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-[#0F1E19]">Redirecting to Staff Workspace...</h2>
        <p className="text-xs text-[#4A5D55] mt-1">Verifying your restaurant station assignments</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/20 mb-4 shadow-sm">
          <Utensils className="w-7 h-7 text-[#16845B]" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F1E19]">
          Welcome Back, Team Member
        </h1>
        <p className="mt-2 text-sm text-[#4A5D55]">
          Sign in to access your restaurant workspace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-black/5 sm:rounded-3xl sm:px-10 border border-[#E3EBE6]">
          {/* Informative Error Banners */}
          {error === "suspended" && (
            <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Account Access Suspended</p>
                <p className="mt-0.5 text-xs text-amber-800">
                  Your employee account is currently inactive or suspended. Please contact your restaurant owner or manager to restore access.
                </p>
              </div>
            </div>
          )}

          {error === "no_membership" && (
            <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">No Restaurant Membership Found</p>
                <p className="mt-0.5 text-xs text-red-800">
                  You are not assigned to an active restaurant workspace. Please request an invitation from your restaurant manager.
                </p>
              </div>
            </div>
          )}

          {error === "invitation_required" && (
            <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900 flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Invitation Required</p>
                <p className="mt-0.5 text-xs text-blue-800">
                  Staff accounts cannot self-register. Please use the invitation link sent by your restaurant administrator.
                </p>
              </div>
            </div>
          )}

          {/* Secure Clerk Staff Sign-in Component */}
          <div className="flex justify-center">
            <ClerkSignIn
              routing="hash"
              forceRedirectUrl={`/staff/auth-callback?next=${encodeURIComponent(next)}`}
              fallbackRedirectUrl={`/staff/auth-callback?next=${encodeURIComponent(next)}`}
              appearance={{
                elements: {
                  card: "shadow-none border-0 p-0 w-full",
                  footerAction: "hidden", // Disallow public self-registration from staff page
                  formButtonPrimary:
                    "bg-[#16845B] hover:bg-[#126B49] text-white font-semibold py-2.5 px-4 rounded-xl transition duration-150",
                  formFieldInput:
                    "rounded-xl border-[#D2DFD8] focus:border-[#16845B] focus:ring-[#16845B]",
                },
              }}
            />
          </div>

          {/* Invitation Acceptance & Owner Redirect Footers */}
          <div className="mt-8 pt-6 border-t border-[#EEF3F0] space-y-3 text-center">
            <Link
              href="/staff/accept-invitation"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#16845B] hover:text-[#126B49] transition"
            >
              <Mail className="w-4 h-4" />
              Have an invitation link? Accept Invitation
            </Link>

            <div>
              <p className="text-xs text-[#6F8279]">
                Are you a Restaurant Owner?{" "}
                <Link
                  href="/owner/login"
                  className="font-medium text-[#0F1E19] hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#6F8279]">
          <ShieldCheck className="w-4 h-4 text-[#16845B]" />
          <span>RestroNex Multi-Tenant Staff Security • Clerk Enterprise Auth</span>
        </div>
      </div>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center text-sm text-[#4A5D55]">Loading staff login...</div>}>
      <StaffLoginContent />
    </Suspense>
  );
}
