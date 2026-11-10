import PrinterSettingsPanel from "@/components/app/PrinterSettingsPanel";
import Link from "next/link";

export default function PrintersSettingsPage() {
  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Devices &amp; Thermal Printers</h1>
          <p className="text-sm text-[#718078]">
            ESC/POS hardware • USB / LAN / BLE / Local Print Bridge • 58mm &amp; 80mm per-outlet defaults
          </p>
        </div>
        <Link
          href="/app/settings/integrations"
          className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-xs font-bold text-[#16845B] hover:bg-[#F8FAF9]"
        >
          Unified WhatsApp &amp; Printing Hub →
        </Link>
      </div>
      <PrinterSettingsPanel />
    </div>
  );
}
