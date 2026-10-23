import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { IceCream, Sparkles, CheckCircle2 } from "lucide-react";

export default function DessertShopsSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        <section className="bg-[#070B07] text-white py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
                  <IceCream className="h-3.5 w-3.5" /> ICE CREAM & DESSERT PARLORS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Scoops, Waffles & <br />
                  <span className="text-[#3D954F]">Toppings Customizer</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Speed through after-dinner dessert rushes. Select cone/cup options, multi-scoop flavors, fudge sauces, and toppings in 2 taps with rapid barcode scanning and UPI pay.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] shadow-lg">
                    Schedule Dessert Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-6 shadow-2xl">
                <div className="text-xs font-bold text-[#3D954F] uppercase tracking-wider">Scoop & Waffle Modifier Screen</div>
                <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-white text-sm">Belgian Waffle Tower</div>
                  <div className="text-white/70">Scoop 1: Salted Caramel Gelato</div>
                  <div className="text-white/70">Scoop 2: Dark Belgian Chocolate</div>
                  <div className="text-amber-400">Toppings: Nutella Drizzle + Roasted Almonds</div>
                  <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-[#3D954F]">
                    <span>Billed in 2.1 seconds</span>
                    <span>₹340</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-slate-900">Tailored for fast-serve parlors</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Multi-Scoop Flow</h3>
                <p className="mt-2 text-sm text-slate-600">Preset buttons for Single, Double, Sundae, and Tub with flavor options and automated inventory deductions.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Take-Home Tub Batching</h3>
                <p className="mt-2 text-sm text-slate-600">Weight-based pricing and cold-pack packaging surcharge automatically applied at checkout.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg">Peak Night Rush Mode</h3>
                <p className="mt-2 text-sm text-slate-600">High-contrast nighttime cashier UI designed for quick outdoor kiosk ordering without eye strain.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
