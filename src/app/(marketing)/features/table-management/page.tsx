import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";
import { LayoutGrid, Users, Smartphone, RefreshCw, Clock, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, MapPin } from "lucide-react";

export default function TableManagementFeaturePage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        {/* Hero */}
        <section className="bg-[#070B07] text-white overflow-hidden py-16 lg:py-20 border-b border-white/10">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#3D954F]/20 border border-[#3D954F]/30 px-3.5 py-1 text-xs font-bold text-[#3D954F]">
                  <LayoutGrid className="h-3.5 w-3.5" /> FLOOR PLAN & CAPTAIN APP
                </div>
                <h1 className="mt-4 text-[38px] sm:text-[48px] font-black tracking-tight leading-[1.05]">
                  Live Table Management <br />
                  <span className="text-[#3D954F]">and Waiter Ordering</span>
                </h1>
                <p className="mt-4 text-base leading-7 text-white/70 max-w-xl">
                  Turn tables 25% faster with real-time floor plans, color-coded table statuses, instant table transfers, and waiter mobile ordering. Never miss a guest request during peak rush.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/book-demo">
                    <button className="rounded-full bg-[#3D954F] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#338a44] transition-all shadow-lg">
                      Schedule Floor Demo →
                    </button>
                  </Link>
                  <Link href="/pricing">
                    <button className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
                      View Pricing
                    </button>
                  </Link>
                </div>
                <div className="mt-6 flex items-center gap-4 text-xs text-white/50">
                  <span>✓ Multi-section floor layouts</span>
                  <span>•</span>
                  <span>✓ Split & merge bills</span>
                  <span>•</span>
                  <span>✓ Captain app on any smartphone</span>
                </div>
              </div>

              {/* Interactive Floor Preview Card */}
              <div className="rounded-[24px] border border-white/10 bg-[#0F1F14] p-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Floor Plan • Main Dining Room</span>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-white/80">14 / 18 Occupied</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { no: "T-01", cap: "4 Pax", status: "Occupied", bill: "₹2,450", time: "42 min", color: "bg-amber-500/20 border-amber-500/40 text-amber-300" },
                    { no: "T-02", cap: "2 Pax", status: "Available", bill: "-", time: "Ready", color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
                    { no: "T-03", cap: "6 Pax", status: "Billed", bill: "₹4,120", time: "Settling", color: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
                    { no: "T-04", cap: "4 Pax", status: "Occupied", bill: "₹1,890", time: "18 min", color: "bg-amber-500/20 border-amber-500/40 text-amber-300" },
                    { no: "T-05", cap: "8 Pax", status: "Reserved", bill: "-", time: "8:30 PM", color: "bg-purple-500/20 border-purple-500/40 text-purple-300" },
                    { no: "T-06", cap: "2 Pax", status: "Available", bill: "-", time: "Ready", color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
                  ].map((table) => (
                    <div key={table.no} className={`rounded-xl border p-3 ${table.color} backdrop-blur-sm`}>
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

                <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-between text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-[#3D954F]" />
                    <span>Captain Sunil punched 3 items on T-04</span>
                  </div>
                  <span className="text-[11px] text-[#3D954F] font-bold">KOT Fired</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities */}
        <section className="py-16 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-widest text-[#3D954F]">END-TO-END SERVICE CONTROL</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-900">Engineered for fine-dine, bistros, and high-volume dining</h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">Eliminate server walk-time and billing confusion with table operations connected directly to the POS and kitchen display.</p>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 grid place-items-center text-[#3D954F]">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Custom Area Layouts</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Design layouts for Indoor Dining, AC Hall, Rooftop, Patio, and Private Dining Rooms (PDR). Set seat capacities and track occupancy rates per area in real-time.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 grid place-items-center text-blue-600">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Captain Mobile Ordering</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Waiters take orders tableside using any Android or iOS device. Modifiers, notes, and course selections fire directly to the kitchen without walking back to the counter.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 grid place-items-center text-amber-600">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">Table Transfers & Merges</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Guests changing seats? Transfer open tickets in one tap. Combine tables for large family groups or split single checks into individual guest bills seamlessly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#070B07] text-white py-14">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-black">Ready to speed up your table service?</h2>
            <p className="mt-2 text-sm text-white/60 max-w-xl mx-auto">Get RestroNex Floor & Captain Management running on your existing tablets and smartphones today.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/book-demo" className="rounded-full bg-[#3D954F] px-7 py-3 text-sm font-bold text-white hover:bg-[#338a44]">
                Book Interactive Demo →
              </Link>
              <Link href="/sign-up" className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white hover:bg-white/10">
                Start 14-Day Free Trial
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
