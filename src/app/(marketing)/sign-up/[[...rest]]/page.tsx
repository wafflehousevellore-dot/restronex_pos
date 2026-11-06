"use client";
import { PageShell } from "@/components/marketing/PageShell";
import { SignUp as ClerkSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SignUpPage() {
  const [planInfo, setPlanInfo] = useState<{ plan: string | null; cycle: string | null; next: string | null }>({
    plan: null,
    cycle: null,
    next: null,
  });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const plan =
      p.get("plan") ||
      document.cookie.split("; ").find((s) => s.startsWith("restronex_plan="))?.split("=")[1] ||
      localStorage.getItem("restronex_plan");
    const cycle =
      p.get("cycle") ||
      document.cookie.split("; ").find((s) => s.startsWith("restronex_cycle="))?.split("=")[1] ||
      "MONTHLY";
    const next = p.get("next") || (plan ? `/app/auth-callback?plan=${plan}&cycle=${cycle}` : "/app/auth-callback");
    setPlanInfo({ plan: plan ? decodeURIComponent(plan) : null, cycle, next });
    if (plan) {
      document.cookie = `restronex_plan=${encodeURIComponent(
        decodeURIComponent(plan)
      )}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      document.cookie = `restronex_cycle=${cycle}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
  }, []);

  return (
    <PageShell
      title="Create your RestroNex account"
      subtitle="Direct restaurant POS subscription & instant onboarding. Clerk Organizations enabled."
      badge="Sign Up • Clerk"
    >
      {planInfo.plan && (
        <div className="max-w-md mx-auto mb-4 rounded-2xl border border-[#16845B]/20 bg-[#E8F5EE] p-3 text-sm text-[#172B25] font-medium">
          You selected <b className="text-[#16845B]">{planInfo.plan}</b> • {planInfo.cycle} — preserved through signup → checkout.{" "}
          <Link href="/pricing" className="underline font-semibold text-[#16845B]">
            Change
          </Link>
        </div>
      )}
      <div className="flex justify-center">
        <ClerkSignUp
          routing="path"
          path="/sign-up"
          signInUrl={`/sign-in?plan=${planInfo.plan || ""}&cycle=${planInfo.cycle || ""}&next=${encodeURIComponent(
            planInfo.next || "/app/auth-callback"
          )}`}
          forceRedirectUrl={planInfo.next || "/app/auth-callback"}
          fallbackRedirectUrl="/app/auth-callback"
        />
      </div>
    </PageShell>
  );
}
