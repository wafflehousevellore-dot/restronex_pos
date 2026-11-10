import WhatsAppSettingsPanel from "@/components/app/WhatsAppSettingsPanel";
import Link from "next/link";

export default function WhatsAppSettingsPage() {
  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">WhatsApp Business Invoicing</h1>
          <p className="text-sm text-[#718078]">
            Official Meta Cloud API • Automated invoice delivery • Utility templates &amp; opt-out enforcement
          </p>
        </div>
        <Link
          href="/app/settings/integrations"
          className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-xs font-bold text-[#16845B] hover:bg-[#F8FAF9]"
        >
          Unified WhatsApp &amp; Printing Hub →
        </Link>
      </div>
      <WhatsAppSettingsPanel />
    </div>
  );
}
