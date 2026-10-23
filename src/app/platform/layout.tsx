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
  // Demo allows non-admin preview; production would redirect
  return (
    <div className="min-h-screen bg-[#070B07] text-white">
      <header className="sticky top-0 z-20 h-[64px] flex items-center justify-between border-b border-white/10 bg-[#07110a] px-6">
        <Link href="/platform" className="flex items-center gap-2.5">
          <Logo variant="light" showText={false} size="small" />
          <div className="text-sm font-black leading-none"><span className="text-white">RestroNex</span> <span className="text-[#3D954F]">Platform</span></div>
          <span className="hidden sm:inline rounded-full bg-[#3D954F]/15 border border-[#3D954F]/20 px-2.5 py-1 text-[10px] font-bold text-[#3D954F]">ADMIN</span>
        </Link>
        <nav className="hidden lg:flex gap-1 text-sm">
          {[
            ["Overview","/platform"],
            ["Tenants","/platform/tenants"],
            ["Plans","/platform/plans"],
            ["Integrations","/platform/integrations"],
            ["Demo Requests","/platform/demo-requests"],
            ["Audit Logs","/platform/audit-logs"],
          ].map(([label,href])=> <Link key={href} href={href} className="px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium">{label}</Link>)}
        </nav>
        <Link href="/app/dashboard" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10">Back to App</Link>
      </header>
      <main className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
}
