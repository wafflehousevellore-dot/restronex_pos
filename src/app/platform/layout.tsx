export const dynamic = "force-dynamic";
import { getPlatformAdminSession } from "@/lib/platform-auth";
import { PLATFORM_ROLE_DESCRIPTIONS, PlatformRole } from "@/lib/platform-roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { UserButton } from "@clerk/nextjs";
import PlatformVerificationGate from "./PlatformVerificationGate";

const PLATFORM_NAV_ITEMS = [
  { label: "Overview", href: "/platform" },
  { label: "Organizations", href: "/platform/tenants" },
  { label: "Outlets", href: "/platform/outlets" },
  { label: "Subscriptions", href: "/platform/subscriptions" },
  { label: "Plans & Pricing", href: "/platform/plans" },
  { label: "Payments", href: "/platform/payments" },
  { label: "Invoices", href: "/platform/invoices" },
  { label: "Revenue Analytics", href: "/platform/revenue" },
  { label: "Notifications", href: "/platform/notifications" },
  { label: "Audit Logs", href: "/platform/audit-logs" },
  { label: "Platform Staff", href: "/platform/users" },
  { label: "Permissions", href: "/platform/permissions" },
  { label: "Platform Settings", href: "/platform/settings" },
];

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const authResult = await getPlatformAdminSession();

  if (!authResult.authorized && "reason" in authResult) {
    if (authResult.reason === "UNAUTHENTICATED") {
      redirect("/sign-in?next=/platform");
    }
    if (
      authResult.reason === "TOTP_REQUIRED" ||
      authResult.reason === "MFA_REQUIRED" ||
      authResult.reason === "REVERIFICATION_REQUIRED"
    ) {
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

  const roleMeta = PLATFORM_ROLE_DESCRIPTIONS[authResult.user.role as PlatformRole] || {
    label: authResult.user.role,
    badgeColor: "bg-[#16845B] text-white",
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#172B25]">
      <header className="sticky top-0 z-20 min-h-[64px] flex flex-wrap items-center justify-between gap-3 border-b border-[#E5EBE7] bg-white/95 backdrop-blur-md px-6 py-2 shadow-xs">
        <Link href="/platform" className="flex items-center gap-2.5">
          <Logo variant="light" showText={false} size="small" />
          <div className="text-sm font-black leading-none">
            <span className="text-[#172B25]">RestroNex</span> <span className="text-[#16845B]">Control Center</span>
          </div>
          <span className={`hidden sm:inline rounded-full px-2.5 py-0.5 text-[10px] font-bold ${roleMeta.badgeColor}`}>
            {roleMeta.label.toUpperCase()}
          </span>
        </Link>
        <nav className="hidden 2xl:flex flex-wrap gap-1 text-sm">
          {PLATFORM_NAV_ITEMS.map(({ label, href }) => (
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
            Restaurant Workspace →
          </Link>
          <UserButton />
        </div>
      </header>

      {/* Responsive Horizontal Scroll Nav for Sub-2XL screens */}
      <div className="2xl:hidden border-b border-[#E5EBE7] bg-white px-4 py-2 overflow-x-auto flex gap-1.5 text-xs">
        {PLATFORM_NAV_ITEMS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="shrink-0 px-3 py-1 rounded-full bg-[#F8FAF9] border border-[#E5EBE7] text-[#172B25] hover:bg-[#E8F5EE] hover:text-[#16845B] font-medium transition"
          >
            {label}
          </Link>
        ))}
      </div>

      {!authResult.mfaEnrolled && (
        <div className="bg-[#E8F5EE] border-b border-[#16845B]/20 px-6 py-2.5 text-xs text-[#172B25] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#16845B] animate-pulse" />
            <span>
              <strong>Security Recommendation:</strong> Enroll in Free RestroNex 2FA / TOTP Authenticator to protect your Platform Admin account.
            </span>
          </div>
          <Link
            href="/platform/settings"
            className="rounded-full bg-[#16845B] text-white px-3 py-1 font-semibold hover:bg-[#116B49] transition text-[11px]"
          >
            Setup 2FA Now
          </Link>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
