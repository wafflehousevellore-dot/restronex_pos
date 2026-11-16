"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import WhatsAppSettingsPanel from "@/components/app/WhatsAppSettingsPanel";
import PrinterSettingsPanel from "@/components/app/PrinterSettingsPanel";
import IntegrationsClient from "@/app/app/integrations/IntegrationsClient";
import { MessageSquare, Printer, Bike } from "lucide-react";

export default function WhatsAppAndPrintingSettingsPage() {
  const [tab, setTab] = useState<"aggregators" | "whatsapp" | "printing">("aggregators");
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");

  useEffect(() => {
    apiFetch("/api/outlets")
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) setOutlets(list);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">
            Integrations Hub
          </h1>
          <p className="text-sm text-[#718078]">
            Manage Swiggy &amp; Zomato auto-order reception, official Meta WhatsApp billing, and automatic thermal receipt printers.
          </p>
        </div>

        {outlets.length > 0 && (
          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="rounded-full border border-[#E5EBE7] bg-white px-4 py-2 text-xs font-bold text-[#172B25] shadow-xs"
          >
            <option value="">All Outlets / Organization Default</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                Outlet: {o.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex gap-2 border-b border-[#E5EBE7] pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setTab("aggregators")}
          className={`rounded-full px-5 py-2 text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            tab === "aggregators"
              ? "bg-[#16845B] text-white shadow-xs"
              : "bg-white border border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
          }`}
        >
          <Bike className="h-3.5 w-3.5" /> Swiggy, Zomato &amp; Online Orders
        </button>
        <button
          type="button"
          onClick={() => setTab("whatsapp")}
          className={`rounded-full px-5 py-2 text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            tab === "whatsapp"
              ? "bg-[#16845B] text-white shadow-xs"
              : "bg-white border border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Business Invoicing
        </button>
        <button
          type="button"
          onClick={() => setTab("printing")}
          className={`rounded-full px-5 py-2 text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            tab === "printing"
              ? "bg-[#16845B] text-white shadow-xs"
              : "bg-white border border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
          }`}
        >
          <Printer className="h-3.5 w-3.5" /> Thermal Receipt Printers
        </button>
      </div>

      {tab === "aggregators" ? (
        <IntegrationsClient />
      ) : tab === "whatsapp" ? (
        <WhatsAppSettingsPanel selectedOutletId={selectedOutletId || undefined} />
      ) : (
        <PrinterSettingsPanel selectedOutletId={selectedOutletId || undefined} />
      )}
    </div>
  );
}
