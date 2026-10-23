import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import Link from "next/link";

export default function PossPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white text-slate-900">
        <section className="bg-[#070B07] text-white overflow-hidden">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-bold tracking-widest text-white/80">RESTAURANT POS • BILLING • KOT</div>
                <h1 className="mt-3 text-[36px] sm:text-[46px] font-black tracking-tight leading-[0.95]">Restaurant POS <br /><span className="text-[#3D954F]">software made simple!</span></h1>
                <p className="mt-4 text-sm leading-7 text-white/60 max-w-xl">Run your restaurant like a pro — billing, KOT, tables, inventory, CRM, and reports in one fast POS. Multi-tenant, audit-logged, offline-ready.</p>
                <div className="mt-6 flex gap-3">
                  <Link href="/book-demo"><button className="rounded-full bg-[#3D954F] px-6 py-3 text-sm font-bold text-white hover:bg-[#2e7a3e]">Take a free demo →</button></Link>
                  <Link href="/pricing"><button className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">View Pricing</button></Link>
                </div>
                <div className="mt-4 text-xs text-white/40">Trusted by 1,00,000+ restaurants • QSR • Fine-dine • Cafes • Cloud kitchens</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white p-3 shadow-2xl">
                <div className="rounded-2xl bg-[#070B07] p-4 text-white">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold">RestroNex POS • Floor Plan • Live KOT</span>
                    <span className="rounded-full bg-[#3D954F] px-3 py-1 text-[11px] font-bold">KOT SENT • Table 12</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {["T01 Free","T02 Billing","T03 KOT","T04 Reserved","T05 Free","T06 Busy"].map(t=>(
                      <div key={t} className={`rounded-xl px-2 py-3 text-center text-xs font-bold ${t.includes("Free")?"bg-white text-slate-900":t.includes("KOT")?"bg-amber-400 text-slate-900":"bg-[#3D954F] text-white"}`}>{t}</div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl bg-white text-slate-900 p-3">
                    <div className="text-xs font-bold">Active Order • T04</div>
                    <div className="mt-2 space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-slate-600">Margherita ×2</span><span className="font-bold">₹598</span></div>
                      <div className="flex justify-between"><span className="text-slate-600">Paneer Tikka ×1</span><span className="font-bold">₹349</span></div>
                      <div className="flex justify-between border-t border-slate-100 pt-2 font-black"><span>Total</span><span>₹1,469.10</span></div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-bold text-center">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">⚡ 3-Click Bill<br/><span className="text-slate-500 font-normal">Merge/split tables</span></div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">📦 Auto Stock<br/><span className="text-slate-500 font-normal">Low-stock alerts</span></div>
                  <div className="rounded-xl bg-[#3D954F] text-white p-3">📊 94 Reports<br/><span className="text-white/80 font-normal">Day-end &lt;5min</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#F7F9F8]">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-10">
            <div className="text-center">
              <div className="text-xs font-bold tracking-[0.16em] text-[#3D954F] uppercase">SMART POS FEATURES</div>
              <h2 className="mt-2 text-[28px] font-black">A restaurant POS made for all your needs</h2>
              <p className="mt-2 text-sm text-slate-600">Fast, reliable billing that handles high order volumes without lag — dine-in, takeaway, and delivery in one screen.</p>
            </div>

            <div className="mt-8 space-y-6">
              {[
                {
                  title: "A quick 3-click restaurant billing software",
                  desc: "Take orders, punch bills and fire KOT in seconds. Split bills, merge tables, apply discounts and coupons, accept UPI/card/cash/wallet — all without leaving the billing screen.",
                  bullets: ["Split bill by item / person", "Merge tables • Table transfer", "Discounts, coupons, happy hours", "UPI / Card / Cash / Wallet split"],
                  link: "/features/pos"
                },
                {
                  title: "Restaurant inventory management made easier",
                  desc: "Recipe-based auto-deduction, low-stock alerts, and purchase management. Know your food cost before the day ends.",
                  bullets: ["Recipe → auto deduction", "Purchase orders + price compare", "Low-stock + expiry alerts", "Central kitchen push"],
                  link: "/features/inventory"
                },
                {
                  title: "Get real-time restaurant reports",
                  desc: "Your POS tracks everything automatically — day-end sales, online orders, staff actions, inventory consumption, and 94+ operational reports without paper.",
                  bullets: ["94 reports + dynamic builder", "Day-End Summary in <5 min", "Sales by time-slot, outlet, payment", "Staff, voids, discounts, CRM"],
                  link: "/features/reports"
                },
                {
                  title: "One online ordering system for all channels",
                  desc: "Accept Swiggy/Zomato orders, QR orders, and website orders in one dashboard. Auto-accept, KDS routing, and revenue tracking without tab-switching.",
                  bullets: ["Auto-accept delivery orders", "KDS stations with bump", "QR / website ordering", "70+ integrations → one view"],
                  link: "/solutions"
                },
              ].map((f, i) => (
                <div key={f.title} className={`rounded-[24px] border border-slate-200 bg-white p-6 flex flex-col ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-6 items-center`}>
                  <div className="flex-1">
                    <h3 className="text-lg font-black">{f.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{f.desc}</p>
                    <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
                      {f.bullets.map(b => <li key={b} className="rounded-full bg-slate-50 border border-slate-200 px-3 py-2 font-semibold text-slate-700">✓ {b}</li>)}
                    </ul>
                    <Link href={f.link} className="mt-4 inline-flex text-sm font-bold text-[#3D954F]">Explore →</Link>
                  </div>
                  <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-br from-[#3D954F]/10 to-slate-50 p-6 w-full h-[220px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl">🍽️</div>
                      <div className="mt-2 text-xs font-bold text-slate-500">POS Feature Preview</div>
                      <div className="text-[11px] text-slate-400">{f.title.slice(0,28)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white border-y border-slate-100">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-10">
            <div className="text-center">
              <div className="text-xs font-bold tracking-[0.16em] text-[#3D954F] uppercase">POS MARKETPLACE</div>
              <h2 className="mt-2 text-[26px] font-black">Supercharge your restaurant POS</h2>
              <p className="mt-1 text-sm text-slate-600">Pick the POS add-ons your outlets actually need — activate in one click, billed per outlet.</p>
            </div>
            <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { k: "CRM & Loyalty", d: "Turn every bill into a relationship. Wallet, rewards, and feedback in one POS flow.", bullets: ["Loyalty / Wallet", "SMS / Email", "Feedback QR", "Website builder"] },
                { k: "Analytics", d: "94 reports that answer every operator question — sales, inventory, staff, CRM, and closures.", bullets: ["94 Reports", "Dynamic reports", "Day-End Summary", "Tally/SAP"] },
                { k: "Guest Experience", d: "Faster service, happier guests — QR ordering, tokens, and self-serve kiosks tied to your POS.", bullets: ["Scan & Pay QR", "Kiosk / Self-order", "Token Display", "Calling device"] },
                { k: "Operations", d: "The back-of-house POS toolkit — KDS, captain, purchasing, and central kitchen control.", bullets: ["KDS", "Captain App", "Purchase Manager", "Recipe costing"] },
              ].map(c => (
                <div key={c.k} className="rounded-[20px] border border-slate-200 bg-[#F7F9F8] p-5">
                  <div className="h-12 w-12 rounded-xl bg-[#3D954F]/10 grid place-items-center text-[#3D954F] text-lg">✦</div>
                  <div className="mt-3 text-sm font-black">{c.k}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{c.d}</p>
                  <ul className="mt-3 space-y-1 text-xs text-slate-700">{c.bullets.map(b => <li key={b}>• {b}</li>)}</ul>
                  <Link href="/features" className="mt-3 inline-flex text-xs font-bold text-[#3D954F]">Learn more →</Link>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
              <span className="rounded-full bg-slate-900 text-white px-4 py-2 font-bold">Marketplace: 120+ services</span>
              <span className="rounded-full bg-white border border-slate-200 px-4 py-2 font-bold">Growth: pick any 5 • Scale: all + credits</span>
            </div>
          </div>
        </section>

        <section className="bg-[#070B07] text-white">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8 py-10 text-center">
            <div className="text-xs font-bold tracking-[0.16em] text-[#3D954F] uppercase">INTEGRATIONS</div>
            <h2 className="mt-2 text-2xl font-black">One POS, every integration</h2>
            <p className="mt-2 text-sm text-white/60">Manage 70+ integrations and services directly from RestroNex POS — payments, delivery, accounting, and marketing.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["Swiggy", "Zomato", "DOTPE", "PhonePe", "Razorpay", "Paytm", "UPI", "Tally", "SAP", "Zoho Books", "BUSY", "UrbanPiper", "Masters India", "Reelo", "Xeno"].map(b => (
                <span key={b} className="rounded-full bg-white text-slate-900 px-4 py-2 text-xs font-black border border-slate-200">{b}</span>
              ))}
            </div>
            <Link href="/integrations"><button className="mt-6 rounded-full bg-[#3D954F] px-6 py-3 text-sm font-bold text-white">See all integrations →</button></Link>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
              POS Editions: Electron (full cloud) • Local (offline) • Android (connector) • Lite (billing-only). Multi-outlet & head-office push on Growth/Scale.
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
