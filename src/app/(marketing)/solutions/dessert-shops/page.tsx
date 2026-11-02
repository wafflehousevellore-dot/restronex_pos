import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { IceCream } from "lucide-react";

export default function DessertShopsSolutionPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white text-[#172B25] py-16 lg:py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
                  <IceCream className="h-3.5 w-3.5" /> ICE CREAM & DESSERT PARLORS
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Scoops, Waffles & <br />
                  <span className="text-[#16845B]">Toppings Customizer</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Speed through after-dinner dessert rushes. Select cone/cup options, multi-scoop flavors, fudge sauces, and toppings in 2 taps with rapid barcode scanning and UPI pay.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo" className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                    Schedule Dessert Demo →
                  </Link>
                  <Link href="/pricing" className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs">
                    Pricing Plans
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="text-xs font-bold text-[#16845B] uppercase tracking-wider">Scoop & Waffle Modifier Screen</div>
                <div className="mt-4 p-5 bg-[#F8FAF9] border border-[#E5EBE7] rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-[#172B25] text-sm">Belgian Waffle Tower</div>
                  <div className="text-[#718078]">Scoop 1: Salted Caramel Gelato</div>
                  <div className="text-[#718078]">Scoop 2: Dark Belgian Chocolate</div>
                  <div className="text-amber-700 font-medium">Toppings: Nutella Drizzle + Roasted Almonds</div>
                  <div className="pt-3 border-t border-[#E5EBE7] flex justify-between font-bold text-[#16845B]">
                    <span>Billed in 2.1 seconds</span>
                    <span className="text-sm">₹340</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-black text-center text-[#172B25]">Tailored for fast-serve parlors</h2>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Multi-Scoop Flow</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Preset buttons for Single, Double, Sundae, and Tub with flavor options and automated inventory deductions.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Take-Home Tub Batching</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">Weight-based pricing and cold-pack packaging surcharge automatically applied at checkout.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-[#E5EBE7] shadow-xs">
                <h3 className="font-bold text-lg text-[#172B25]">Peak Night Rush Mode</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">High-contrast cashier UI designed for quick outdoor kiosk ordering without eye strain.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
