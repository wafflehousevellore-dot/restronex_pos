import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Store, Users, DollarSign, CheckCircle2 } from "lucide-react";

export default function FoodCourtsSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        <section className="bg-[#070B07] text-white py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
                  <Store className="h-3.5 w-3.5" /> FOOD COURTS & MALL HUBS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Multi-Vendor Food Court <br />
                  <span className="text-[#3D954F]">Central POS & Revenue Sharing</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Run complex food courts with unified prepaid card top-ups, single cashier counters that split KOTs to different brand kiosks, and automated daily tenant revenue settlement reports.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] shadow-lg">
                    Schedule Food Court Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-6 shadow-2xl">
                <div className="text-xs font-bold text-[#3D954F] uppercase tracking-wider">Multi-Stall KOT Split</div>
                <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-white text-sm">Customer Order #FC-890</div>
                  <div className="p-2 bg-white/5 rounded border border-white/10 flex justify-between">
                    <span>Stall 1 (Dosa Express)</span>
                    <span className="text-emerald-400 font-bold">KOT Fired (Token #41)</span>
                  </div>
                  <div className="p-2 bg-white/5 rounded border border-white/10 flex justify-between">
                    <span>Stall 4 (Burger Barn)</span>
                    <span className="text-emerald-400 font-bold">KOT Fired (Token #18)</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-white/70 flex justify-between">
                    <span>Single Card / UPI Payment</span>
                    <span className="font-bold text-white">₹580 Settled</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-slate-900">Food court management capabilities</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Central Cash Counter</h3>
                <p className="mt-2 text-sm text-slate-600">Guests order from multiple food court brands on a single bill, with orders auto-routing to respective stall kitchens.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Revenue Sharing Audits</h3>
                <p className="mt-2 text-sm text-slate-600">Calculate CAM charges, utility deductions, and percentage revenue share for each stall vendor automatically.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Unified Overhead Token TV</h3>
                <p className="mt-2 text-sm text-slate-600">Single LED display across the dining hall shows ready tokens for all vendors simultaneously.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
