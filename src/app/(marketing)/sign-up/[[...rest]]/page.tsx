"use client";
import { PageShell } from "@/components/marketing/PageShell";
import { SignUp as ClerkSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SignUpPage() {
  const [planInfo, setPlanInfo] = useState<{ plan: string | null; cycle: string | null; next: string | null }>({ plan: null, cycle: null, next: null });

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const plan = p.get("plan") || document.cookie.split("; ").find((s) => s.startsWith("restronex_plan="))?.split("=")[1] || localStorage.getItem("restronex_plan");
    const cycle = p.get("cycle") || document.cookie.split("; ").find((s) => s.startsWith("restronex_cycle="))?.split("=")[1] || "MONTHLY";
    const next = p.get("next") || (plan ? `/checkout?plan=${plan}&cycle=${cycle}` : "/organization");
    setPlanInfo({ plan: plan ? decodeURIComponent(plan) : null, cycle, next });
    if (plan) {
      document.cookie = `restronex_plan=${encodeURIComponent(decodeURIComponent(plan))}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      document.cookie = `restronex_cycle=${cycle}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
  }, []);

  return (
    <PageShell title="Create your RestroNex account" subtitle="Start your 14-day free trial — no card required. Clerk Organizations enabled." badge="Sign Up • Clerk">
      {planInfo.plan && (
        <div className="max-w-md mx-auto mb-4 rounded-2xl border border-[#3D954F]/30 bg-[#3D954F]/10 p-3 text-sm text-white">
          You selected <b>{planInfo.plan}</b> • {planInfo.cycle} — preserved through signup → checkout. <Link href="/pricing" className="underline">Change</Link>
        </div>
      )}
      <div className="flex justify-center">
        <ClerkSignUp
          routing="path"
          path="/sign-up"
          signInUrl={`/sign-in?plan=${planInfo.plan || ""}&cycle=${planInfo.cycle || ""}&next=${encodeURIComponent(planInfo.next || "/organization")}`}
          forceRedirectUrl={planInfo.next || "/organization"}
          fallbackRedirectUrl="/organization"
        />
      </div>

      {/* Dev Mode Test Credentials & 1-Click Bypass */}
      <div className="max-w-md mx-auto mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70 space-y-2">
        <div className="font-bold text-white flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Clerk Development Mode Notice
        </div>
        <p className="text-white/60">
          Clerk free test mode restricts SMS for Indian (+91) numbers. To continue:
        </p>
        <ul className="list-disc list-inside space-y-1 text-white/80">
          <li>Use Clerk's test phone: <b className="text-emerald-400 font-mono">+1 555-555-0100</b> (OTP: <span className="font-mono text-emerald-400">424242</span>)</li>
          <li>Or disable "Phone Number" requirement in <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">Clerk Dashboard</a></li>
        </ul>
        <div className="pt-2 border-t border-white/10 flex justify-between items-center">
          <span className="text-white/50">Need instant POS access?</span>
          <a
            href="/api/auth/sign-in?email=owner@demo.in&password=demo1234&redirect=/app/pos"
            className="rounded-full bg-[#3D954F] px-3.5 py-1 text-[11px] font-bold text-white hover:bg-[#338a44]"
          >
            1-Click Demo Login →
          </a>
        </div>
      </div>
    </PageShell>
  );
}
