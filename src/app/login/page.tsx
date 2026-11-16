import Link from "next/link";
import { Building2, UtensilsCrossed, ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Sign In to RestroNex — Select Portal",
  description: "Choose your RestroNex portal: Restaurant Owner & Admin or Staff Workspace (POS & KDS).",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Logo variant="light" />
          </Link>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F1E19]">
          Choose Your Portal
        </h1>
        <p className="mt-2 text-base text-[#4A5D55]">
          Select your role to access your dedicated RestroNex workspace.
        </p>
      </div>

      {/* Main Selection Cards */}
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl my-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Restaurant Owner */}
          <div className="bg-white rounded-3xl p-8 border border-[#E3EBE6] shadow-xl shadow-black/5 flex flex-col justify-between hover:border-[#16845B]/50 transition duration-200">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center text-[#16845B] mb-5">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-[#0F1E19]">Restaurant Owner</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#16845B]">
                  Admin
                </span>
              </div>
              <p className="text-sm text-[#4A5D55] leading-relaxed">
                Manage your restaurant business, active subscriptions, menu items, multi-outlet settings, employee permissions, and financial reports.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <Link
                href="/owner/login"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#16845B] hover:bg-[#126B49] text-white py-3 px-4 font-semibold text-sm transition shadow-sm"
              >
                <span>Sign In as Owner</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="text-center text-xs text-[#718078]">
                New restaurant owner?{" "}
                <Link href="/owner/signup" className="text-[#16845B] font-semibold hover:underline">
                  Sign up free
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Staff Member */}
          <div className="bg-white rounded-3xl p-8 border border-[#E3EBE6] shadow-xl shadow-black/5 flex flex-col justify-between hover:border-[#16845B]/50 transition duration-200">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/20 flex items-center justify-center text-[#16845B] mb-5">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-[#0F1E19]">Staff Member</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#16845B]">
                  POS / KDS
                </span>
              </div>
              <p className="text-sm text-[#4A5D55] leading-relaxed">
                Access your assigned terminal: instant POS billing, loud audio kitchen display (KDS), table floor orders, and stock updates.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <Link
                href="/staff/login"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#D2DFD8] hover:border-[#16845B] bg-[#F8FAF9] hover:bg-[#E8F5EE]/40 text-[#0F1E19] py-3 px-4 font-semibold text-sm transition shadow-xs"
              >
                <span>Sign In to Staff Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="text-center text-xs text-[#718078]">
                Have an invitation code?{" "}
                <Link href="/staff/accept-invitation" className="text-[#16845B] font-semibold hover:underline">
                  Accept invitation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-xs text-[#718078]">
          <ShieldCheck className="w-4 h-4 text-[#16845B]" />
          <span>Enterprise Multi-Tenant Security • Clerk Enterprise Authentication</span>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-[#718078]">
          <Link href="/" className="hover:text-[#16845B] transition">Home</Link>
          <span>•</span>
          <Link href="/pricing" className="hover:text-[#16845B] transition">Pricing</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-[#16845B] transition">Contact Support</Link>
          <span>•</span>
          <Link href="/platform" className="hover:text-[#16845B] transition">Platform Admin</Link>
        </div>
      </div>
    </div>
  );
}
