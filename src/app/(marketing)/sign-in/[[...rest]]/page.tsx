"use client";
import { PageShell } from "@/components/marketing/PageShell";
import { SignIn as ClerkSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const [planInfo, setPlanInfo] = useState<{ plan: string | null; cycle: string | null; next: string | null }>({ plan: null, cycle: null, next: null });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const plan = p.get("plan") || document.cookie.split("; ").find((s) => s.startsWith("restronex_plan="))?.split("=")[1] || localStorage.getItem("restronex_plan");
    const cycle = p.get("cycle") || "MONTHLY";
    const next = p.get("next") || (plan ? `/checkout?plan=${plan}&cycle=${cycle}` : "/organization");
    setPlanInfo({ plan: plan ? decodeURIComponent(plan) : null, cycle, next });
    if (plan) document.cookie = `restronex_plan=${encodeURIComponent(decodeURIComponent(plan))}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  }, []);

  return (
    <PageShell title="Sign in to RestroNex" subtitle="Clerk Organizations • Secure POS access." badge="Sign In • Clerk">
      {planInfo.plan && (
        <div className="max-w-md mx-auto mb-4 rounded-2xl border border-[#3D954F]/30 bg-[#3D954F]/10 p-3 text-sm text-white">
          Selected <b>{planInfo.plan}</b> • {planInfo.cycle} preserved → checkout. <Link href="/pricing" className="underline">Change</Link>
        </div>
      )}
      <div className="flex justify-center">
        <ClerkSignIn
          routing="path"
          path="/sign-in"
          signUpUrl={`/sign-up?plan=${planInfo.plan || ""}&cycle=${planInfo.cycle || ""}&next=${encodeURIComponent(planInfo.next || "/organization")}`}
          forceRedirectUrl={planInfo.next || "/organization"}
          fallbackRedirectUrl="/organization"
        />
      </div>

      {/* 1-Click Demo Login */}
      <div className="max-w-md mx-auto mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70 flex justify-between items-center">
        <div>
          <div className="font-bold text-white">Instant Demo Access</div>
          <div className="text-white/50 text-[11px]">Spice Route Demo Owner (`owner@demo.in`)</div>
        </div>
        <a
          href="/api/auth/sign-in?email=owner@demo.in&password=demo1234&redirect=/app/pos"
          className="rounded-full bg-[#3D954F] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#338a44]"
        >
          1-Click Demo Login →
        </a>
      </div>
    </PageShell>
  );
}
