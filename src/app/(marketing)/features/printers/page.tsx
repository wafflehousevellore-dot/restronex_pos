import { PageShell } from "@/components/marketing/PageShell";
import Link from "next/link";
import { Printer, Check, ArrowRight, ShieldCheck, Cpu } from "lucide-react";

export default function PrintersFeaturePage() {
  const capabilities = [
    { title: "Bluetooth ESC/POS Mobile Printers", desc: "Pair 58mm and 80mm wireless Bluetooth thermal printers directly from handheld tablets and billing counters using modern Web Bluetooth or Android SPP bridge." },
    { title: "Network LAN / Wi-Fi Kitchen Printers", desc: "Configure high-speed thermal printers over Ethernet or Wi-Fi (standard TCP port 9100) to fire loud, auto-cut tickets into busy hot kitchens." },
    { title: "Station Routing by Category", desc: "Route food items to Kitchen Printer, drinks to Bar Printer, and desserts to Pastry Station automatically from a single unified order." },
    { title: "Custom Receipt Headers & Footers", desc: "Include your restaurant name, branch address, phone, GSTIN number, FSSAI license, Wi-Fi password, and feedback QR code." },
    { title: "Print Queue & Retry Engine", desc: "Every print job is tracked in a reliable queue (PENDING, PRINTED, FAILED). Idempotent retry checks prevent duplicate billing slips and kitchen confusion." },
    { title: "Instant In-App Test Printing", desc: "Perform diagnostic print checks from the dashboard to verify paper alignment, character encoding, and baud rate before opening service." },
  ];

  const categories = [
    { name: "58mm Bluetooth Handheld", ideal: "Food trucks, QSR quick counter, table captains", protocol: "ESC/POS over Bluetooth BLE / SPP" },
    { name: "80mm USB Thermal Printer", ideal: "Main cashier counter, high-volume checkout", protocol: "Direct USB raw printer protocol" },
    { name: "80mm Ethernet / LAN Printer", ideal: "Hot kitchen KOT station, Bar preparation", protocol: "Raw TCP/IP socket (Port 9100) with buzzer" },
  ];

  return (
    <PageShell
      title="Thermal & Bluetooth Printer Management"
      subtitle="Connect Bluetooth, USB, and LAN thermal receipt printers with smart multi-station routing."
      badge="Hardware Integration • RestroNex"
    >
      <div className="space-y-10">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 text-[#16845B] font-bold text-sm mb-3">
              <Printer className="h-5 w-5" />
              <span>Reliable Hardware That Never Misses An Order</span>
            </div>
            <h2 className="text-xl font-bold text-[#172B25]">Fast, Resilient Printing For High-Pressure Shifts</h2>
            <p className="mt-2 text-sm text-[#718078] leading-relaxed">
              RestroNex supports industry-standard ESC/POS protocols across Bluetooth mobile units, counter USB units, and Ethernet kitchen printers. No proprietary printer lock-in.
            </p>

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {capabilities.map((c) => (
                <div key={c.title} className="p-4 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9]/60 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-[#172B25]">
                    <Check className="h-4 w-4 text-[#16845B] shrink-0" />
                    <span>{c.title}</span>
                  </div>
                  <p className="text-xs text-[#718078] leading-relaxed pl-6">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#16845B] font-bold text-xs uppercase tracking-wider mb-2">
                <Cpu className="h-4 w-4" /> Hardware Compatibility
              </div>
              <h3 className="text-lg font-bold text-[#172B25]">Standard ESC/POS Protocol Support</h3>
              <div className="mt-4 space-y-3">
                {categories.map((cat) => (
                  <div key={cat.name} className="p-3.5 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9]">
                    <div className="font-bold text-sm text-[#172B25]">{cat.name}</div>
                    <div className="text-xs text-[#16845B] font-semibold mt-0.5">{cat.protocol}</div>
                    <div className="text-xs text-[#718078] mt-1">Best for: {cat.ideal}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E5EBE7] space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#16845B] font-semibold">
                <ShieldCheck className="h-4 w-4" /> Offline Resilient Print Queue Prevents Lost Orders
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="rounded-full bg-[#16845B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#116B49] transition shadow-xs inline-flex items-center gap-1.5"
                >
                  Configure In App <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-[#E5EBE7] bg-white px-6 py-2.5 text-sm font-semibold text-[#172B25] hover:bg-[#F8FAF9] transition shadow-xs"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
