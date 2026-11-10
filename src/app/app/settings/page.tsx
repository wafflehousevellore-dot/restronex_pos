import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Printer, ArrowRight } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Restaurant Settings</h1>
        <p className="text-sm text-[#718078]">Tenant configurations, WhatsApp &amp; Thermal Printer integrations, and security policies.</p>
      </div>

      <Link
        href="/app/settings/integrations"
        className="block rounded-2xl border border-[#16845B]/30 bg-[#E8F5EE]/50 p-5 hover:bg-[#E8F5EE] transition shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#16845B] text-white grid place-items-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-black text-[#172B25]">
                Integrations → WhatsApp Business &amp; Thermal Printing
              </div>
              <div className="text-xs text-[#718078] mt-0.5">
                Configure per-outlet Meta WhatsApp Cloud API invoice delivery, default printers (58mm/80mm), retry queues, and test runs.
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16845B] px-5 py-2 text-xs font-bold text-white">
            Open Integrations <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/app/settings/whatsapp" className="rounded-2xl border border-[#E5EBE7] bg-white p-5 hover:border-[#16845B] transition shadow-xs">
          <div className="flex items-center gap-2 font-bold text-sm text-[#172B25]">
            <MessageSquare className="h-4 w-4 text-[#16845B]" /> WhatsApp Invoicing Settings
          </div>
          <p className="text-xs text-[#718078] mt-1">Manage Meta Cloud API tokens, templates, test pings, and delivery logs.</p>
        </Link>
        <Link href="/app/settings/printers" className="rounded-2xl border border-[#E5EBE7] bg-white p-5 hover:border-[#16845B] transition shadow-xs">
          <div className="flex items-center gap-2 font-bold text-sm text-[#172B25]">
            <Printer className="h-4 w-4 text-[#16845B]" /> Thermal Printer Devices
          </div>
          <p className="text-xs text-[#718078] mt-1">Configure USB, LAN, BLE, or Local Bridge receipt printers per outlet.</p>
        </Link>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Restaurant Settings &amp; Legal</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#718078] space-y-2 leading-relaxed">
          <div>GST and FSSAI numbers, receipt header and footer notes, service charge percentages, KOT, and table layout preferences are saved directly to your RestaurantSetting record.</div>
          <div>Country, time zone, and currency are tenant-level attributes that feed into tax calculations, report time-bucketing, and minor-unit currency formatting.</div>
        </CardContent>
      </Card>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Security &amp; Tenant Isolation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#718078] leading-relaxed">
          Your tenant ID is derived securely from server-authenticated session tokens. All monetary and stock movements run in atomic PostgreSQL transactions.
        </CardContent>
      </Card>
    </div>
  );
}
