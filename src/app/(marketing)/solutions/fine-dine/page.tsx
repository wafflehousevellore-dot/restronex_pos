import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { UtensilsCrossed, Calendar, Users, Wine, CheckCircle2 } from "lucide-react";

export default function FineDineSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        <section className="bg-[#070B07] text-white py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
                  <UtensilsCrossed className="h-3.5 w-3.5" /> FINE DINING & BISTROS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Sophisticated Service <br />
                  <span className="text-[#3D954F]">For Fine-Dine Restaurants</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Deliver five-star hospitality with multi-course firing (Appetizer → Entree → Dessert), tableside sommelier wine notes, guest preference tagging, and split billing by seat.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] shadow-lg">
                    Schedule Fine-Dine Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-6 shadow-2xl">
                <div className="flex justify-between items-center text-xs font-bold text-[#3D954F]">
                  <span>COURSE MANAGEMENT • TABLE 7</span>
                  <span className="bg-[#3D954F]/20 px-2 py-0.5 rounded text-white">4 Guests</span>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">Course 1: Truffle Carpaccio</div>
                      <div className="text-white/50 text-[11px]">Fired at 8:15 PM</div>
                    </div>
                    <span className="text-emerald-400 font-bold">Served ✓</span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">Course 2: Pan-Seared Chilean Sea Bass</div>
                      <div className="text-white/50 text-[11px]">Hold until captain signals</div>
                    </div>
                    <span className="text-amber-400 font-bold">Hold (Ready to Fire)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-slate-900">Hospitality features built for premium dining</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Course-Wise KOT Firing</h3>
                <p className="mt-2 text-sm text-slate-600">Kitchen receives course tags to time complex preparation perfectly with guest dining pace.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Item & Seat Split Billing</h3>
                <p className="mt-2 text-sm text-slate-600">Split checks by percentage, seat number, or specific items without server calculation errors.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">VIP Guest History</h3>
                <p className="mt-2 text-sm text-slate-600">Record anniversary dates, favorite tables, wine vintages, and allergy alerts on the captain's screen.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
