export type IntegrationProvider = "swiggy" | "zomato" | "dotpe" | "qr_ordering" | "printer" | "accounting";
export type IntegrationStatus = "NOT_CONNECTED" | "CONFIGURED" | "CONNECTED" | "ERROR";

export const INTEGRATIONS: Array<{
  provider: IntegrationProvider;
  name: string;
  description: string;
  category: "Ordering" | "In-store" | "Accounting";
  requiredFields: Array<{ key: string; label: string; placeholder: string; type?: string }>;
  docsUrl?: string;
}> = [
  {
    provider: "swiggy",
    name: "Swiggy",
    description: "Sync online orders, menu, and status with Swiggy partner APIs. Requires Swiggy Partner API key + store ID.",
    category: "Ordering",
    requiredFields: [
      { key: "apiKey", label: "Swiggy API Key", placeholder: "swiggy_sk_..." },
      { key: "storeId", label: "Swiggy Store ID", placeholder: "123456" },
      { key: "partnerId", label: "Partner ID", placeholder: "partner_..." },
    ],
    docsUrl: "https://partner.swiggy.com",
  },
  {
    provider: "zomato",
    name: "Zomato",
    description: "Connect Zomato Ordering. Requires Zomato API key and restaurant Res ID with partner permissions.",
    category: "Ordering",
    requiredFields: [
      { key: "apiKey", label: "Zomato API Key", placeholder: "zomato_api_..." },
      { key: "restaurantId", label: "Restaurant ID", placeholder: "18234..." },
    ],
    docsUrl: "https://www.zomato.com/partners",
  },
  {
    provider: "dotpe",
    name: "Generic Ordering Channel",
    description: "Generic online ordering channel adapter (DotPe, etc.). Configure webhook URL + API credentials.",
    category: "Ordering",
    requiredFields: [
      { key: "apiKey", label: "Channel API Key", placeholder: "ch_..." },
      { key: "webhookSecret", label: "Webhook Secret", placeholder: "whsec_..." },
    ],
  },
  {
    provider: "qr_ordering",
    name: "QR Ordering",
    description: `Dine-in QR menu at /qr/[outletSlug]. Guests scan, order, pay — KOT auto-fired. No extra credentials.`,
    category: "In-store",
    requiredFields: [],
  },
  {
    provider: "printer",
    name: "Network Printer / KDS",
    description: "Thermal printer + Kitchen Display System. Configure printer IP + station mapping (MAIN/BEVERAGE/DESSERT).",
    category: "In-store",
    requiredFields: [
      { key: "printerIp", label: "Printer IP", placeholder: "192.168.1.100" },
      { key: "station", label: "Station", placeholder: "MAIN" },
    ],
  },
  {
    provider: "accounting",
    name: "Accounting Export (Tally / SAP)",
    description: "Export sales, inventory, day-end to Tally or SAP format. Configure export schedule + format.",
    category: "Accounting",
    requiredFields: [
      { key: "format", label: "Export Format", placeholder: "Tally XML / CSV" },
    ],
  },
];

export function getIntegrationMeta(provider: string) {
  return INTEGRATIONS.find(i => i.provider === provider) || null;
}

export function statusLabel(s: IntegrationStatus) {
  switch(s){
    case "CONNECTED": return { text: "Connected", color: "bg-[#3D954F] text-white border-[#3D954F]" };
    case "CONFIGURED": return { text: "Configured", color: "bg-amber-500/15 text-amber-300 border-amber-500/20" };
    case "ERROR": return { text: "Error", color: "bg-red-500/15 text-red-300 border-red-500/20" };
    default: return { text: "Not connected", color: "bg-white/5 text-white/40 border-white/10" };
  }
}
