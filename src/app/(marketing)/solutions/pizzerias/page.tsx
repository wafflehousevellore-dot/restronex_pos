import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { Pizza, Layers, Truck, CheckCircle2 } from "lucide-react";

export default function PizzeriasSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        <section className="bg-[#070B07] text-white py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
                  <Pizza className="h-3.5 w-3.5" /> PIZZA OUTLETS & CHAINS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Half-and-Half Custom <br />
                  <span className="text-[#3D954F]">Crust & Topping Matrix</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Handle complex pizza modifications with ease: half-and-half toppings, cheese-burst crust options, extra sauces, oven station routing, and driver dispatch management.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] shadow-lg">
                    Schedule Pizzeria Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-6 shadow-2xl">
                <div className="text-xs font-bold text-[#3D954F] uppercase tracking-wider">Pizza Builder Screen</div>
                <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-white text-sm">12" Large Sourdough Pizza</div>
                  <div className="text-emerald-400">Left Half: Pepperoni + Jalapeños + Extra Mozzarella</div>
                  <div className="text-amber-400">Right Half: Quattro Formaggi + Truffle Oil</div>
                  <div className="text-white/60">Crust: Stuffed Garlic & Herb (+₹120)</div>
                  <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-white">
                    <span>Oven Timer: 6 mins (Deck 2)</span>
                    <span className="text-[#3D954F]">Total: ₹840</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-slate-900">Built for pizzeria operations</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Half & Half Builder</h3>
                <p className="mt-2 text-sm text-slate-600">Split any pizza into two different recipes with auto-weighted cheese and topping inventory consumption.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Oven Dispatch KDS</h3>
                <p className="mt-2 text-sm text-slate-600">Track prep, oven loading, bake countdown timers, and box inspection before rider pickup.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Delivery Zone Geo-Pricing</h3>
                <p className="mt-2 text-sm text-slate-600">Set distance-based delivery fees and minimum order values for rain/late-night surge.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
