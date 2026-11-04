import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { LayoutGrid, Smartphone, RefreshCw, MapPin } from "lucide-react";

export default function TableManagementFeaturePage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#F8FAF9] text-[#172B25]">
        {/* Hero */}
        <section className="bg-gradient-to-b from-[#E8F5EE]/60 via-[#F8FAF9] to-white text-[#172B25] overflow-hidden py-16 lg:py-20 border-b border-[#E5EBE7]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
                  <LayoutGrid className="h-3.5 w-3.5" /> FLOOR PLAN & CAPTAIN APP
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05] text-[#172B25]">
                  Live Table Management <br />
                  <span className="text-[#16845B]">and Waiter Ordering</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-[#718078] max-w-xl">
                  Turn tables 25% faster with real-time floor plans, color-coded table statuses, instant table transfers, and waiter mobile ordering. Never miss a guest request during peak rush.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#16845B] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#116B49] transition-all shadow-xs">
                      Schedule Floor Demo →
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-[#E5EBE7] bg-white px-7 py-3.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition-colors shadow-xs">
                      View Pricing
                    </button>
                  </Link>
                </div>
                <div className="mt-6 flex items-center gap-4 text-xs text-[#718078]">
                  <span>✓ Multi-section floor layouts</span>
                  <span>•</span>
                  <span>✓ Split & merge bills</span>
                  <span>•</span>
                  <span>✓ Captain app on any smartphone</span>
                </div>
              </div>

              {/* Interactive Floor Preview Card */}
              <div className="rounded-[24px] border border-[#E5EBE7] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#16845B] animate-pulse" />
                    <span className="text-xs font-bold text-[#172B25] uppercase tracking-wider">Floor Plan • Main Dining Room</span>
                  </div>
                  <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#16845B]">
                    14 / 18 Occupied
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { no: "T-01", cap: "4 Pax", status: "Occupied", bill: "₹2,450", time: "42 min", bg: "bg-amber-50 border-amber-200 text-amber-900" },
                    { no: "T-02", cap: "2 Pax", status: "Available", bill: "-", time: "Ready", bg: "bg-[#E8F5EE] border-[#16845B]/20 text-[#16845B]" },
                    { no: "T-03", cap: "6 Pax", status: "Billed", bill: "₹4,120", time: "Settling", bg: "bg-blue-50 border-blue-200 text-blue-900" },
                    { no: "T-04", cap: "4 Pax", status: "Occupied", bill: "₹1,890", time: "18 min", bg: "bg-amber-50 border-amber-200 text-amber-900" },
                    { no: "T-05", cap: "8 Pax", status: "Reserved", bill: "-", time: "8:30 PM", bg: "bg-purple-50 border-purple-200 text-purple-900" },
                    { no: "T-06", cap: "2 Pax", status: "Available", bill: "-", time: "Ready", bg: "bg-[#E8F5EE] border-[#16845B]/20 text-[#16845B]" },
                  ].map((table) => (
                    <div key={table.no} className={`rounded-xl border p-3 ${table.bg}`}>
                      <div className="flex justify-between items-center text-xs font-black">
                        <span>{table.no}</span>
                        <span className="text-[10px] opacity-80">{table.cap}</span>
                      </div>
                      <div className="mt-2 text-sm font-bold">{table.status}</div>
                      <div className="mt-1 flex justify-between text-[11px] opacity-75">
                        <span>{table.bill}</span>
                        <span>{table.time}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3.5 flex items-center justify-between text-xs text-[#172B25]">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-[#16845B]" />
                    <span className="font-medium">Captain Sunil punched 3 items on T-04</span>
                  </div>
                  <span className="text-[11px] text-[#16845B] font-bold">KOT Fired</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities */}
        <section className="py-16 sm:py-20 bg-[#F8FAF9]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#16845B]">END-TO-END SERVICE CONTROL</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-[#172B25]">Engineered for fine-dine, bistros, and high-volume dining</h2>
              <p className="mt-3 text-sm sm:text-base text-[#718078]">
                Eliminate server walk-time and billing confusion with table operations connected directly to the POS and kitchen display.
              </p>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs hover:border-[#16845B]/30 transition-all">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Custom Area Layouts</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Design layouts for Indoor Dining, AC Hall, Rooftop, Patio, and Private Dining Rooms (PDR). Set seat capacities and track occupancy rates per area in real-time.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs hover:border-[#16845B]/30 transition-all">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Captain Mobile Ordering</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Waiters take orders tableside using any Android or iOS device. Modifiers, notes, and course selections fire directly to the kitchen without walking back to the counter.
                </p>
              </div>

              <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 shadow-xs hover:border-[#16845B]/30 transition-all">
                <div className="h-10 w-10 rounded-xl bg-[#E8F5EE] border border-[#16845B]/20 grid place-items-center text-[#16845B]">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#172B25]">Table Transfers & Merges</h3>
                <p className="mt-2 text-sm text-[#718078] leading-relaxed">
                  Guests changing seats? Transfer open tickets in one tap. Combine tables for large family groups or split single checks into individual guest bills seamlessly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#E8F5EE]/40 border-t border-[#E5EBE7] text-[#172B25] py-16">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-[#172B25]">Ready to speed up your table service?</h2>
            <p className="mt-2 text-sm text-[#718078] max-w-xl mx-auto">Get RestroNex Floor & Captain Management running on your existing tablets and smartphones today.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/book-demo" className="rounded-full bg-[#16845B] px-7 py-3 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs">
                Book Interactive Demo →
              </Link>
              <Link href="/sign-up" className="rounded-full border border-[#E5EBE7] bg-white px-6 py-3 text-sm font-bold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs">
                Get Started Now
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
