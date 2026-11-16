"use client";

import { PageShell } from "@/components/marketing/PageShell";
import { SignUp as ClerkSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function OwnerSignupContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/checkout";

  return (
    <PageShell
      title="Create Your Restaurant Workspace"
      subtitle="Start your cloud restaurant journey with RestroNex POS & KDS."
      badge="RestroNex • New Restaurant"
    >
      <div className="max-w-md mx-auto">
        <div className="bg-white py-8 px-4 shadow-xl shadow-black/5 sm:rounded-3xl sm:px-10 border border-[#E3EBE6]">
          <div className="flex justify-center">
            <ClerkSignUp
              routing="hash"
              signInUrl="/owner/login"
              forceRedirectUrl={next}
              fallbackRedirectUrl="/checkout"
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
              Already have an owner account?{" "}
              <Link
                href="/owner/login"
                className="font-semibold text-[#16845B] hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default function OwnerSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-sm text-[#4A5D55]">Loading signup...</div>}>
      <OwnerSignupContent />
    </Suspense>
  );
}

