"use client";
import { apiFetch } from "@/lib/api";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs";
import { LayoutDashboard, ShoppingCart, Utensils, ChefHat, Table2, Box, Users, BarChart3, Building2, UserCog, Settings, Plug, CreditCard, FileText, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const nav = [
  { label:"Dashboard", href:"/app/dashboard", icon: LayoutDashboard },
  { label:"POS", href:"/app/pos", icon: ShoppingCart },
  { label:"Orders", href:"/app/orders", icon: FileText },
  { label:"Tables", href:"/app/tables", icon: Table2 },
  { label:"Kitchen", href:"/app/kitchen", icon: ChefHat },
  { label:"Menu", href:"/app/menu", icon: Utensils },
  { label:"Inventory", href:"/app/inventory", icon: Box },
  { label:"Purchases", href:"/app/purchases", icon: Box },
  { label:"Customers", href:"/app/customers", icon: Users },
  { label:"Reports", href:"/app/reports", icon: BarChart3 },
  { label:"Outlets", href:"/app/outlets", icon: Building2 },
  { label:"Staff", href:"/app/staff", icon: UserCog },
  { label:"Integrations", href:"/app/integrations", icon: Plug },
  { label:"Subscription", href:"/app/subscription", icon: CreditCard },
  { label:"Marketplace", href:"/app/marketplace", icon: Plug },
  { label:"Tokens", href:"/app/tokens", icon: FileText },
  { label:"Reservations", href:"/app/reservations", icon: Table2 },
  { label:"Feedback", href:"/app/feedback", icon: Users },
  { label:"Expenses", href:"/app/expenses", icon: CreditCard },
  { label:"Settings", href:"/app/settings", icon: Settings },
  { label:"Audit Logs", href:"/app/audit-logs", icon: FileText },
];

export default function AppShell({ children, user, tenant, outlet }: { children: React.ReactNode; user?: any; tenant?: any; outlet?: any }) {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  async function signOut(){
    await fetch("/api/auth/sign-out",{method:"POST", credentials:"same-origin"});
    window.location.href="/sign-in";
  }
  return (
    <div className="min-h-screen bg-[#070B07] flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-[264px] bg-[#07110a] text-white flex flex-col border-r border-white/10 ${mobile ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} transition-transform`}>
        <div className="h-[64px] flex items-center justify-between px-4 border-b border-white/10 bg-[#070B07]">
          <a href="/app/dashboard" className="flex items-center gap-2.5">
            <Logo variant="light" showText={false} size="small" />
            <div><div className="text-sm font-black text-white leading-none"><span>Restro</span><span className="text-[#3D954F]">Nex</span></div><div className="text-[10px] tracking-[0.14em] uppercase text-white/40">Restaurant OS</div></div>
          </a>
          <button className="lg:hidden p-2 text-white/60 hover:text-white" onClick={()=>setMobile(false)}><X className="h-5 w-5"/></button>
        </div>
        {tenant && (
          <div className="px-3 py-3 border-b border-white/10">
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3">
              <div className="text-xs font-bold text-white truncate">{tenant.name}</div>
              <div className="text-xs text-white/50 truncate">{outlet ? outlet.name : `${tenant.outlets?.length||0} outlet(s)`} • {tenant.businessType}</div>
              <div className="mt-2 flex gap-1.5">
                <span className="rounded-full bg-[#3D954F] px-2 py-0.5 text-[10px] font-bold text-white">LIVE</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">Tenant-isolated</span>
              </div>
            </div>
          </div>
        )}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {nav.map(n=>{
            const active = pathname===n.href || pathname.startsWith(n.href+"/");
            const Icon = n.icon;
            return (
              <a key={n.href} href={n.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-[#3D954F] text-white shadow-lg" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
                <Icon className="h-4 w-4 shrink-0"/>{n.label}
              </a>
            );
          })}
          <div className="pt-2 mt-2 border-t border-white/10">
            <a href="/platform" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[#3D954F] hover:bg-white/5">Platform Admin →</a>
          </div>
        </nav>
        <div className="p-3 border-t border-white/10 bg-[#070B07] space-y-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-2">
            <div className="text-[10px] font-bold tracking-widest text-white/40 mb-1 px-1">CLERK ORG</div>
            <OrganizationSwitcher hidePersonal createOrganizationMode="navigation" createOrganizationUrl="/organization" afterCreateOrganizationUrl="/organization" afterSelectOrganizationUrl="/app/dashboard" appearance={{ elements: { organizationSwitcherTrigger: "bg-[#070B07] border border-white/10 text-white hover:bg-white/5 w-full", organizationPreviewTextContainer: "text-white", organizationSwitcherTriggerIcon: "text-white/40" } }} />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white">{user?.name?.slice(0,2).toUpperCase() || "U"}</div>
            <div className="flex-1 min-w-0"><div className="text-sm font-bold text-white truncate">{user?.name || "User"}</div><div className="text-xs text-white/40 truncate">{user?.email || ""}</div></div>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "h-8 w-8" } }} />
            <button onClick={signOut} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white"><LogOut className="h-4 w-4"/></button>
          </div>
        </div>
      </aside>

      <div className="flex-1 lg:pl-[264px] flex flex-col min-h-screen bg-[#070B07]">
        <header className="sticky top-0 z-20 h-[64px] flex items-center justify-between gap-3 border-b border-white/10 bg-[#070B07]/80 backdrop-blur px-4">
          <div className="flex items-center gap-2">
            <button className="lg:hidden p-2 rounded-xl border border-white/10 text-white" onClick={()=>setMobile(true)}><Menu className="h-5 w-5"/></button>
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-semibold text-white/70"><span className="h-2 w-2 rounded-full bg-[#3D954F] animate-pulse"/> Tenant-isolated • Paise math • Audit-logged</span>
          </div>
          <div className="flex items-center gap-2">
            <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/app/dashboard" appearance={{ elements: { organizationSwitcherTrigger: "bg-white/5 border border-white/15 text-white hover:bg-white/10 text-xs px-3 py-1.5" } }} />
            <a href="/app/onboarding" className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10">Onboarding</a>
            <a href="/app/pos" className="rounded-full bg-[#3D954F] px-5 py-2 text-xs font-bold text-white hover:bg-[#2e7a3e]">Open POS</a>
            <UserButton />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 bg-[#070B07]">{children}</main>
        <footer className="border-t border-white/10 bg-[#07110a] px-6 py-3 text-xs text-white/40">© 2025 RestroNex • GST-ready • Razorpay verified • Honest sync states • <a href="/" className="text-[#3D954F] hover:text-white">Public site →</a></footer> {/* eslint-disable-line @next/next/no-html-link-for-pages */}
      </div>
    </div>
  );
}
