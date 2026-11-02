import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Pizza } from "lucide-react";

export default function PizzeriasSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white text-[#172B25] py-16 lg:py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
                  <Pizza className="h-3.5 w-3.5" /> PIZZA OUTLETS & CHAINS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Half-and-Half Custom <br />
                  <span className="text-[#16845B]">Crust & Topping Matrix</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Handle complex pizza modifications with ease: half-and-half toppings, cheese-burst crust options, extra sauces, oven station routing, and driver dispatch management.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                    Schedule Pizzeria Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="text-xs font-bold text-[#16845B] uppercase tracking-wider">Pizza Builder Screen</div>
                <div className="mt-4 p-5 bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl space-y-2.5 text-xs">
                  <div className="font-bold text-[#172B25] text-sm">12&quot; Large Sourdough Pizza</div>
                  <div className="text-[#16845B] font-medium">Left Half: Pepperoni + Jalapeños + Extra Mozzarella</div>
                  <div className="text-amber-800 font-medium">Right Half: Quattro Formaggi + Truffle Oil</div>
                  <div className="text-[#718078]">Crust: Stuffed Garlic & Herb (+₹120)</div>
                  <div className="pt-3 border-t border-[#E5EBE7] flex justify-between items-center font-bold">
                    <span className="text-[#718078]">Oven Timer: 6 mins (Deck 2)</span>
                    <span className="text-[#16845B] text-sm">Total: ₹840</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-[#172B25]">Built for pizzeria operations</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Half & Half Builder</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Split any pizza into two different recipes with auto-weighted cheese and topping inventory consumption.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Oven Dispatch KDS</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Track prep, oven loading, bake countdown timers, and box inspection before rider pickup.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Delivery Zone Geo-Pricing</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Set distance-based delivery fees and minimum order values for rain/late-night surge.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
