export type IntegrationProvider =
  | "swiggy"
  | "zomato"
  | "qr_ordering"
  | "printer"
  | "accounting"
  | "dotpe";

export type IntegrationStatus =
  | "NOT_CONNECTED"
  | "REQUESTED"
  | "PENDING_APPROVAL"
  | "AUTHENTICATION_PENDING"
  | "OUTLET_MAPPING_PENDING"
  | "CONNECTED"
  | "ERROR"
  | "DISCONNECTED"
  | "CONFIGURED"; // Legacy fallback

export type ConnectionMode =
  | "PARTNER_ONBOARDING" // Swiggy & Zomato: Merchant Phone + Outlet mapping + Official Partner Approval
  | "ONE_CLICK"          // QR Ordering: Instant table contactless menu
  | "DEVICE_LAN"         // Thermal Printer: Local IP & Port & Station
  | "DATA_EXPORT"        // Tally / Zoho / SAP: Format & Export schedule
  | "WEBHOOK_ADAPTER";   // Generic channel adapter

export interface IntegrationOutletMapping {
  localOutletId: string;
  localOutletName: string;
  providerStoreId: string;
  providerStoreName?: string;
  status: "ACTIVE" | "PENDING";
}

export interface IntegrationCapabilities {
  orders: boolean;
  menu: boolean;
  availability: boolean;
  orderStatus: boolean;
  riderTracking: boolean;
}

export interface IntegrationErrorLog {
  timestamp: string;
  code?: string;
  message: string;
}

export interface IntegrationConfigData {
  outletId?: string;
  registeredPhone?: string;
  merchantName?: string;
  providerStoreId?: string;
  providerStoreName?: string;
  outletMappings?: IntegrationOutletMapping[];
  requestedAt?: string;
  approvedAt?: string;
  verifiedAt?: string;
  statusMessage?: string;
  lastError?: string | null;
  errorHistory?: IntegrationErrorLog[];
  capabilities?: IntegrationCapabilities;
  webhookUrl?: string;
  // Hardware / Local Printer
  printerIp?: string;
  printerPort?: number;
  printerPaper?: "80mm" | "58mm";
  printerStation?: "MAIN" | "BEVERAGE" | "DESSERT" | "BILLING";
  // Accounting
  exportFormat?: "TALLY_XML" | "ZOHO_BOOKS" | "CSV";
  exportSchedule?: "DAILY_DAY_END" | "WEEKLY" | "MANUAL";
  // Generic Webhook Channel
  apiKey?: string;
  webhookSecret?: string;
  // Encrypted provider token if issued via OAuth
  encryptedToken?: string;
}

export interface IntegrationMeta {
  provider: IntegrationProvider;
  name: string;
  category: "Ordering" | "In-store" | "Accounting";
  connectionMode: ConnectionMode;
  tagline: string;
  description: string;
  officialPortalUrl: string;
  officialPortalName: string;
  webhookPath?: string;
  defaultCapabilities?: IntegrationCapabilities;
}

export const INTEGRATIONS: IntegrationMeta[] = [
  {
    provider: "swiggy",
    name: "Swiggy",
    category: "Ordering",
    connectionMode: "PARTNER_ONBOARDING",
    tagline: "Direct POS Integration & Real-time KOT Firing",
    description:
      "Connect your Swiggy merchant outlet using your registered mobile number. RestroNex syncs incoming orders, pushes menu availability, and updates live order status via official Swiggy Partner APIs.",
    officialPortalUrl: "https://partner.swiggy.com",
    officialPortalName: "Swiggy Partner Portal",
    webhookPath: "/api/webhooks/swiggy",
    defaultCapabilities: {
      orders: true,
      menu: true,
      availability: true,
      orderStatus: true,
      riderTracking: true,
    },
  },
  {
    provider: "zomato",
    name: "Zomato",
    category: "Ordering",
    connectionMode: "PARTNER_ONBOARDING",
    tagline: "Official POS Integration & Rider Tracking",
    description:
      "Connect your Zomato restaurant using your merchant registered phone number. Synchronize live online orders, dispatch kitchen tickets (KOT), mark food preparation status, and track riders.",
    officialPortalUrl: "https://www.zomato.com/partners",
    officialPortalName: "Zomato for Business",
    webhookPath: "/api/webhooks/zomato",
    defaultCapabilities: {
      orders: true,
      menu: true,
      availability: true,
      orderStatus: true,
      riderTracking: true,
    },
  },
  {
    provider: "qr_ordering",
    name: "Contactless QR Dine-in",
    category: "In-store",
    connectionMode: "ONE_CLICK",
    tagline: "Instant Table QR Menu with Direct KOT Firing",
    description:
      "Place digital QR codes on each dining table. Guests scan with their smartphones, browse food photos, and order dishes. Orders appear instantly on POS and kitchen display without app downloads.",
    officialPortalUrl: "https://www.restronexpos.com",
    officialPortalName: "RestroNex Table Engine",
    defaultCapabilities: {
      orders: true,
      menu: true,
      availability: true,
      orderStatus: true,
      riderTracking: false,
    },
  },
  {
    provider: "printer",
    name: "Network Thermal Printer & KDS",
    category: "In-store",
    connectionMode: "DEVICE_LAN",
    tagline: "ESC/POS LAN Thermal Printing & Station KOTs",
    description:
      "Configure your local receipt and kitchen thermal printers (80mm / 58mm). Assign station routing (Kitchen, Bar, Dessert, Billing Counter) and send test print pings across your local restaurant network.",
    officialPortalUrl: "https://www.restronexpos.com",
    officialPortalName: "Local Hardware Hub",
    defaultCapabilities: {
      orders: true,
      menu: false,
      availability: false,
      orderStatus: true,
      riderTracking: false,
    },
  },
  {
    provider: "accounting",
    name: "Accounting & ERP Export",
    category: "Accounting",
    connectionMode: "DATA_EXPORT",
    tagline: "Tally Prime XML, Zoho Books & General Ledger",
    description:
      "Export sales revenue, CGST/SGST tax breakdown, payment tenders (Cash, UPI, Cards), and day-end registers formatted for Tally Prime XML, Zoho Books, or Excel.",
    officialPortalUrl: "https://tallysolutions.com",
    officialPortalName: "Tally Prime Integration",
    defaultCapabilities: {
      orders: false,
      menu: false,
      availability: false,
      orderStatus: false,
      riderTracking: false,
    },
  },
  {
    provider: "dotpe",
    name: "Generic Online Channels (DotPe / Thrive / ONDC)",
    category: "Ordering",
    connectionMode: "WEBHOOK_ADAPTER",
    tagline: "Unified Aggregator & Direct Webhook Bridge",
    description:
      "Connect alternate online ordering channels or custom websites via RestroNex's secure webhook gateway. Automatically accepts external payload formats and fires KOTs.",
    officialPortalUrl: "https://www.restronexpos.com",
    officialPortalName: "RestroNex Webhook Gateway",
    webhookPath: "/api/webhooks/orders",
    defaultCapabilities: {
      orders: true,
      menu: false,
      availability: true,
      orderStatus: true,
      riderTracking: false,
    },
  },
];

export function getIntegrationMeta(provider: string): IntegrationMeta | null {
  return INTEGRATIONS.find((i) => i.provider === provider) || null;
}

export function statusLabel(s: IntegrationStatus | string): {
  text: string;
  color: string;
  badgeClass: string;
  description: string;
} {
  switch (s) {
    case "CONNECTED":
      return {
        text: "Connected ✓",
        color: "#16845B",
        badgeClass: "bg-[#E8F5EE] text-[#16845B] border-[#16845B]/30",
        description: "Official integration active and verified. Live synchronization running.",
      };
    case "PENDING_APPROVAL":
      return {
        text: "Pending Partner Approval",
        color: "#B45309",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
        description: "Your connection request has been recorded. Partner approval required.",
      };
    case "REQUESTED":
      return {
        text: "Request Submitted",
        color: "#1D4ED8",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
        description: "Merchant connection request initiated. Awaiting provider portal confirmation.",
      };
    case "AUTHENTICATION_PENDING":
      return {
        text: "Auth Confirmation Pending",
        color: "#D97706",
        badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
        description: "Please confirm POS partner authorization in your provider merchant app.",
      };
    case "OUTLET_MAPPING_PENDING":
      return {
        text: "Outlet Mapping Needed",
        color: "#7C3AED",
        badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
        description: "Account authorized. Please select and assign which outlet corresponds to this store.",
      };
    case "CONFIGURED":
      return {
        text: "Configured (Awaiting Test)",
        color: "#D97706",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        description: "Connection parameters saved. Run verification test to connect.",
      };
    case "ERROR":
      return {
        text: "Connection Error",
        color: "#B91C1C",
        badgeClass: "bg-red-50 text-red-700 border-red-200",
        description: "Verification failed or token expired. Check provider dashboard status.",
      };
    case "DISCONNECTED":
      return {
        text: "Disconnected",
        color: "#718078",
        badgeClass: "bg-[#F8FAF9] text-[#718078] border-[#E5EBE7]",
        description: "Integration disconnected by restaurant owner.",
      };
    default:
      return {
        text: "Not connected",
        color: "#718078",
        badgeClass: "bg-[#F8FAF9] text-[#718078] border-[#E5EBE7]",
        description: "No connection established. Click connect to link your restaurant.",
      };
  }
}

export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  // Clean spaces, hyphens, and leading +91 / 0
  const clean = phone.replace(/[\s\-+]/g, "");
  let national = clean;
  if (clean.startsWith("91") && clean.length === 12) national = clean.slice(2);
  else if (clean.startsWith("0") && clean.length === 11) national = clean.slice(1);
  return /^[6-9]\d{9}$/.test(national);
}

export function cleanIndianPhone(phone: string): string {
  const clean = phone.replace(/[\s\-+]/g, "");
  if (clean.startsWith("91") && clean.length === 12) return clean.slice(2);
  if (clean.startsWith("0") && clean.length === 11) return clean.slice(1);
  return clean;
}
