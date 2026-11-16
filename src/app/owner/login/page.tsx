"use client";

import { PageShell } from "@/components/marketing/PageShell";
import { SignIn as ClerkSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OwnerLoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app/auth-callback";

  return (
    <PageShell
      title="Restaurant Owner Portal"
      subtitle="Sign in to manage your restaurant, subscriptions, outlets, and staff."
      badge="RestroNex • Owner Login"
    >
      <div className="max-w-md mx-auto">
        <div className="bg-white py-8 px-4 shadow-xl shadow-black/5 sm:rounded-3xl sm:px-10 border border-[#E3EBE6]">
          <div className="flex justify-center">
            <ClerkSignIn
              routing="hash"
              signUpUrl="/owner/signup"
              forceRedirectUrl={next}
              fallbackRedirectUrl="/app/auth-callback"
              appearance={{
                elements: {
                  card: "shadow-none border-0 p-0 w-full",
                  formButtonPrimary:
                    "bg-[#16845B] hover:bg-[#126B49] text-white font-semibold py-2.5 px-4 rounded-xl transition duration-150",
                  formFieldInput:
                    "rounded-xl border-[#D2DFD8] focus:border-[#16845B] focus:ring-[#16845B]",
                },
              }}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-[#EEF3F0] text-center space-y-2">
            <p className="text-xs text-[#6F8279]">
              Are you a kitchen employee or restaurant staff?{" "}
              <Link
                href="/staff/login"
                className="font-semibold text-[#16845B] hover:underline"
              >
                Staff Login Here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default function OwnerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-sm text-[#4A5D55]">Loading owner login...</div>}>
      <OwnerLoginContent />
    </Suspense>
  );
}
