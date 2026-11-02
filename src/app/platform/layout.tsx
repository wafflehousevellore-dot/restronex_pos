export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default async function PlatformLayout({ children }: { children: React.ReactNode }){
  const { user, userId } = await getSession();
  if(!userId) redirect("/sign-in");
  const dbUser = await prisma.user.findUnique({ where:{ id: userId }});

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#172B25]">
      <header className="sticky top-0 z-20 h-[64px] flex items-center justify-between border-b border-[#E5EBE7] bg-white/95 backdrop-blur-md px-6 shadow-xs">
        <Link href="/platform" className="flex items-center gap-2.5">
          <Logo variant="light" showText={false} size="small" />
          <div className="text-sm font-black leading-none">
            <span className="text-[#172B25]">RestroNex</span> <span className="text-[#16845B]">Platform</span>
          </div>
          <span className="hidden sm:inline rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-2.5 py-0.5 text-[10px] font-bold text-[#16845B]">
            SUPER ADMIN
          </span>
        </Link>
        <nav className="hidden lg:flex gap-1 text-sm">
          {[
            ["Overview","/platform"],
            ["Tenants","/platform/tenants"],
            ["Plans","/platform/plans"],
            ["Integrations","/platform/integrations"],
            ["Demo Requests","/platform/demo-requests"],
            ["Audit Logs","/platform/audit-logs"],
          ].map(([label,href])=> (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-xl text-[#718078] hover:text-[#172B25] hover:bg-[#E8F5EE]/60 text-sm font-medium transition"
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/app/dashboard"
          className="rounded-full border border-[#E5EBE7] bg-white px-4 py-1.5 text-xs font-semibold text-[#172B25] hover:bg-[#F8FAF9] shadow-xs transition"
        >
          Back to App
        </Link>
      </header>
      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
}
