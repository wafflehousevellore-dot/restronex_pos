export const dynamic = "force-dynamic";
import { getPlatformOwnerSession } from "@/lib/platform-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { UserButton } from "@clerk/nextjs";
import PlatformVerificationGate from "./PlatformVerificationGate";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const authResult = await getPlatformOwnerSession();

  if (!authResult.authorized && "reason" in authResult) {
    if (authResult.reason === "UNAUTHENTICATED") {
      redirect("/sign-in?next=/platform");
    }
    if (authResult.reason === "MFA_REQUIRED" || authResult.reason === "REVERIFICATION_REQUIRED") {
      return (
        <PlatformVerificationGate
          reason={authResult.reason}
          message={authResult.message}
          requireMfaLevel={authResult.reason === "MFA_REQUIRED"}
        />
      );
    }
    redirect("/app/dashboard");
  }
  if (!("user" in authResult)) {
    redirect("/sign-in?next=/platform");
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#172B25]">
      <header className="sticky top-0 z-20 min-h-[64px] flex flex-wrap items-center justify-between gap-3 border-b border-[#E5EBE7] bg-white/95 backdrop-blur-md px-6 py-2 shadow-xs">
        <Link href="/platform" className="flex items-center gap-2.5">
          <Logo variant="light" showText={false} size="small" />
          <div className="text-sm font-black leading-none">
            <span className="text-[#172B25]">RestroNex</span> <span className="text-[#16845B]">Platform</span>
          </div>
          <span className="hidden sm:inline rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-2.5 py-0.5 text-[10px] font-bold text-[#16845B]">
            PLATFORM OWNER
          </span>
        </Link>
        <nav className="hidden xl:flex flex-wrap gap-1 text-sm">
          {[
            ["Overview", "/platform"],
            ["Organizations", "/platform/tenants"],
            ["Subscriptions", "/platform/subscriptions"],
            ["Plans", "/platform/plans"],
            ["Users", "/platform/users"],
            ["Integrations", "/platform/integrations"],
            ["Demo Requests", "/platform/demo-requests"],
            ["Audit Logs", "/platform/audit-logs"],
            ["Settings", "/platform/settings"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="px-2.5 py-1.5 rounded-xl text-[#718078] hover:text-[#172B25] hover:bg-[#E8F5EE]/60 text-xs font-semibold transition"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <Link
            href="/app/dashboard"
            className="rounded-full border border-[#E5EBE7] bg-white px-4 py-1.5 text-xs font-semibold text-[#172B25] hover:bg-[#F8FAF9] shadow-xs transition"
          >
            Back to App
          </Link>
          <UserButton />
        </div>
      </header>
      <div className="xl:hidden border-b border-[#E5EBE7] bg-white px-4 py-2 overflow-x-auto flex gap-2 text-xs">
        {[
          ["Overview", "/platform"],
          ["Organizations", "/platform/tenants"],
          ["Subscriptions", "/platform/subscriptions"],
          ["Plans", "/platform/plans"],
          ["Users", "/platform/users"],
          ["Integrations", "/platform/integrations"],
          ["Demo Requests", "/platform/demo-requests"],
          ["Audit Logs", "/platform/audit-logs"],
          ["Settings", "/platform/settings"],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="shrink-0 px-3 py-1 rounded-full bg-[#F8FAF9] border border-[#E5EBE7] text-[#172B25] font-medium"
          >
            {label}
          </Link>
        ))}
      </div>
      {!authResult.mfaEnrolled && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            <b>Security Notice:</b> Hardware/TOTP MFA is not yet enrolled on <b>{authResult.user.email}</b> in Clerk. Enable Authenticator App 2FA in your Clerk Dashboard → User &amp; Authentication → Multi-factor, then enroll below.
          </span>
          <Link href="/platform/settings" className="font-bold underline text-amber-950">
            Security &amp; MFA Settings →
          </Link>
        </div>
      )}
      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
}
