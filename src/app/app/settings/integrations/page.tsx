"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import WhatsAppSettingsPanel from "@/components/app/WhatsAppSettingsPanel";
import SmsSettingsPanel from "@/components/app/messaging/SmsSettingsPanel";
import MessageDeliveryLogsPanel from "@/components/app/messaging/MessageDeliveryLogsPanel";
import PrinterSettingsPanel from "@/components/app/PrinterSettingsPanel";
import IntegrationsClient from "@/app/app/integrations/IntegrationsClient";
import { MessageSquare, Printer, Bike, Send, ListOrdered } from "lucide-react";

export default function WhatsAppAndPrintingSettingsPage() {
  const [tab, setTab] = useState<"aggregators" | "whatsapp" | "sms" | "logs" | "printing">("aggregators");
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
            Integrations &amp; Customer Invoicing Hub
          </h1>
          <p className="text-sm text-[#718078]">
            Manage delivery channels, official WhatsApp billing, transactional SMS gateways, delivery tracking, and thermal receipt printers.
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
          <Bike className="h-3.5 w-3.5" /> Channels &amp; QR Ordering
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
          <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Invoicing
        </button>
        <button
          type="button"
          onClick={() => setTab("sms")}
          className={`rounded-full px-5 py-2 text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            tab === "sms"
              ? "bg-[#16845B] text-white shadow-xs"
              : "bg-white border border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
          }`}
        >
          <Send className="h-3.5 w-3.5" /> SMS Gateway
        </button>
        <button
          type="button"
          onClick={() => setTab("logs")}
          className={`rounded-full px-5 py-2 text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            tab === "logs"
              ? "bg-[#16845B] text-white shadow-xs"
              : "bg-white border border-[#E5EBE7] text-[#718078] hover:text-[#172B25]"
          }`}
        >
          <ListOrdered className="h-3.5 w-3.5" /> Delivery Logs &amp; Audit
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
      ) : tab === "sms" ? (
        <SmsSettingsPanel />
      ) : tab === "logs" ? (
        <MessageDeliveryLogsPanel outletId={selectedOutletId || undefined} />
      ) : (
        <PrinterSettingsPanel selectedOutletId={selectedOutletId || undefined} />
      )}
    </div>
  );
}
