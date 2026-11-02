import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

export default function FineDineSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white text-[#172B25] py-16 lg:py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
                  <UtensilsCrossed className="h-3.5 w-3.5" /> FINE DINING & BISTROS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Sophisticated Service <br />
                  <span className="text-[#16845B]">For Fine-Dine Restaurants</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Deliver five-star hospitality with multi-course firing (Appetizer → Entree → Dessert), tableside sommelier wine notes, guest preference tagging, and split billing by seat.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                    Schedule Fine-Dine Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="flex justify-between items-center text-xs font-bold text-[#16845B]">
                  <span>COURSE MANAGEMENT • TABLE 7</span>
                  <span className="bg-[#E8F5EE] border border-[#16845B]/20 px-2.5 py-0.5 rounded-full text-[#16845B]">4 Guests</span>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7] flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#172B25] text-sm">Course 1: Truffle Carpaccio</div>
                      <div className="text-[#718078] text-[11px] mt-0.5">Fired at 8:15 PM</div>
                    </div>
                    <span className="bg-[#E8F5EE] text-[#16845B] font-bold px-2.5 py-1 rounded-full text-[11px]">Served ✓</span>
                  </div>
                  <div className="p-4 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7] flex justify-between items-center">
                    <div>
                      <div className="font-bold text-[#172B25] text-sm">Course 2: Pan-Seared Chilean Sea Bass</div>
                      <div className="text-[#718078] text-[11px] mt-0.5">Hold until captain signals</div>
                    </div>
                    <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2.5 py-1 rounded-full text-[11px]">Hold (Ready to Fire)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-[#172B25]">Hospitality features built for premium dining</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Course-Wise KOT Firing</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Kitchen receives course tags to time complex preparation perfectly with guest dining pace.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Item & Seat Split Billing</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Split checks by percentage, seat number, or specific items without server calculation errors.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">VIP Guest History</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Record anniversary dates, favorite tables, wine vintages, and allergy alerts on the captain&apos;s screen.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
