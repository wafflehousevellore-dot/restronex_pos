"use client";
import { PageShell } from "@/components/marketing/PageShell";
import { SignIn as ClerkSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, UtensilsCrossed } from "lucide-react";

export default function SignInPage() {
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
    const cycle = p.get("cycle") || "MONTHLY";
    const next = p.get("next") || (plan ? `/app/auth-callback?plan=${plan}&cycle=${cycle}` : "/app/auth-callback");
    setPlanInfo({ plan: plan ? decodeURIComponent(plan) : null, cycle, next });
    if (plan) {
      document.cookie = `restronex_plan=${encodeURIComponent(
        decodeURIComponent(plan)
      )}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
  }, []);

  return (
    <PageShell title="Sign in to RestroNex" subtitle="Select your role to access your workspace." badge="Sign In • RestroNex">
      {/* Role Switcher */}
      <div className="max-w-md mx-auto mb-6 p-1.5 bg-[#F0F4F1] rounded-2xl flex items-center border border-[#E0E8E3]">
        <div className="flex-1 py-2 px-3 text-center rounded-xl bg-white shadow-xs text-xs font-bold text-[#16845B] flex items-center justify-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          Restaurant Owner
        </div>
        <Link
          href="/staff/login"
          className="flex-1 py-2 px-3 text-center rounded-xl text-xs font-semibold text-[#718078] hover:text-[#172B25] hover:bg-white/60 transition flex items-center justify-center gap-1.5"
        >
          <UtensilsCrossed className="w-3.5 h-3.5 text-[#718078]" />
          Staff Portal →
        </Link>
      </div>

      {planInfo.plan && (
        <div className="max-w-md mx-auto mb-4 rounded-2xl border border-[#16845B]/20 bg-[#E8F5EE] p-3 text-sm text-[#172B25] font-medium">
          Selected <b className="text-[#16845B]">{planInfo.plan}</b> • {planInfo.cycle} preserved → checkout.{" "}
          <Link href="/pricing" className="underline font-semibold text-[#16845B]">
            Change
          </Link>
        </div>
      )}
      <div className="flex justify-center">
        <ClerkSignIn
          routing="path"
          path="/sign-in"
          signUpUrl={`/sign-up?plan=${planInfo.plan || ""}&cycle=${planInfo.cycle || ""}&next=${encodeURIComponent(
            planInfo.next || "/app/auth-callback"
          )}`}
          forceRedirectUrl={planInfo.next || "/app/auth-callback"}
          fallbackRedirectUrl="/app/auth-callback"
        />
      </div>

      <div className="max-w-md mx-auto mt-6 text-center text-xs text-[#718078]">
        Are you a kitchen employee or POS cashier?{" "}
        <Link href="/staff/login" className="font-semibold text-[#16845B] hover:underline">
          Go to Staff Login
        </Link>
      </div>
    </PageShell>
  );
}
