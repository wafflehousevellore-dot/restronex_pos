export type IntegrationProvider =
  | "razorpay"
  | "offline_pos"
  | "direct_upi"
  | "whatsapp"
  | "printer"
  | "swiggy"
  | "zomato"
  | "qr_ordering"
  | "accounting"
  | "zoho_books"
  | "dotpe";

export type IntegrationCategory =
  | "ALL"
  | "PAYMENTS"
  | "WHATSAPP"
  | "PRINTERS"
  | "ONLINE_ORDERING"
  | "ACCOUNTING";

export type IntegrationStatus =
  | "NOT_CONNECTED"
  | "REQUESTED"
  | "PENDING_APPROVAL"
  | "PROVIDER_APPROVAL_REQUIRED"
  | "AUTHENTICATION_PENDING"
  | "OUTLET_MAPPING_PENDING"
  | "CONNECTED"
  | "ERROR"
  | "DISCONNECTED"
  | "CONFIGURED"; // Legacy fallback

export type ConnectionMode =
  | "PARTNER_ONBOARDING" // Partner Onboarding: Merchant Phone + Outlet mapping + Official Approval
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
  // OTP Verification Fields
  otpCode?: string;
  otpExpiresAt?: string;
  otpSentAt?: string;
  partnerToken?: string;
}

export interface IntegrationMeta {
  provider: IntegrationProvider;
  name: string;
  category: "Payments" | "WhatsApp" | "Hardware" | "Ordering" | "Accounting";
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
    provider: "razorpay",
    name: "Razorpay Payment Gateway",
    category: "Payments",
    connectionMode: "WEBHOOK_ADAPTER",
    tagline: "Accept Cards, NetBanking, UPI & Wallets with Automated Reconciliation",
    description:
      "Accept customer payments directly into your registered business bank account. Supports dynamic QR, checkout modal, instant webhooks, and automated refund processing.",
    officialPortalUrl: "https://dashboard.razorpay.com",
    officialPortalName: "Razorpay Merchant Dashboard",
    webhookPath: "/api/webhooks/razorpay",
    defaultCapabilities: {
      orders: true,
      menu: false,
      availability: false,
      orderStatus: true,
      riderTracking: false,
    },
  },
  {
    provider: "direct_upi",
    name: "Direct Dynamic UPI QR (0% Fee)",
    category: "Payments",
    connectionMode: "ONE_CLICK",
    tagline: "Instant VPA Dynamic QR for Google Pay, PhonePe & Paytm",
    description:
      "Generate dynamic UPI payment QRs on bills and contactless table menus with your own merchant VPA. Zero gateway commissions with direct bank account credit.",
    officialPortalUrl: "https://www.npci.org.in",
    officialPortalName: "NPCI Unified Payments Interface",
    defaultCapabilities: {
      orders: true,
      menu: false,
      availability: false,
      orderStatus: true,
      riderTracking: false,
    },
  },
  {
    provider: "offline_pos",
    name: "Counter Cash & Card Terminal (Offline)",
    category: "Payments",
    connectionMode: "ONE_CLICK",
    tagline: "Physical Cash Drawer Reconciliation & EDC Card Swipe Tracking",
    description:
      "Record in-person counter cash tenders with denomination breakdown, EDC card machine swipe approvals, and split-tender billing directly on POS billing terminal.",
    officialPortalUrl: "https://www.restronexpos.com",
    officialPortalName: "RestroNex POS Billing Terminal",
    defaultCapabilities: {
      orders: true,
      menu: false,
      availability: false,
      orderStatus: true,
      riderTracking: false,
    },
  },
  {
    provider: "whatsapp",
    name: "WhatsApp Business API (Meta Cloud API)",
    category: "WhatsApp",
    connectionMode: "PARTNER_ONBOARDING",
    tagline: "Automated Digital Tax Invoices & Transactional Alerts",
    description:
      "Send digital PDF invoices, table booking confirmations, and order ready notifications to customers directly on WhatsApp via the official Meta WhatsApp Business Cloud API.",
    officialPortalUrl: "https://business.facebook.com",
    officialPortalName: "Meta Business Suite & WhatsApp Manager",
    webhookPath: "/api/webhooks/whatsapp",
    defaultCapabilities: {
      orders: true,
      menu: false,
      availability: false,
      orderStatus: true,
      riderTracking: false,
    },
  },
  {
    provider: "printer",
    name: "Thermal Receipt & KOT Printers",
    category: "Hardware",
    connectionMode: "DEVICE_LAN",
    tagline: "ESC/POS 80mm & 58mm Thermal Printers (LAN / USB / Bluetooth)",
    description:
      "High-speed thermal receipt and kitchen order ticket printing. Route orders automatically by station (Cashier Bill, Hot Kitchen KOT, Cold/Bar KOT) via Network LAN IP, USB, or Bluetooth.",
    officialPortalUrl: "https://www.restronexpos.com",
    officialPortalName: "RestroNex Hardware Station Hub",
    defaultCapabilities: {
      orders: true,
      menu: false,
      availability: false,
      orderStatus: true,
      riderTracking: false,
    },
  },
  {
    provider: "swiggy",
    name: "Swiggy Food Delivery Bridge",
    category: "Ordering",
    connectionMode: "PARTNER_ONBOARDING",
    tagline: "Direct POS Order Ingestion, Kitchen KOT Firing & Menu Sync",
    description:
      "Connect your Swiggy partner store. Incoming delivery orders automatically appear in POS, fire kitchen KOTs, and print thermal slips with automated status updates.",
    officialPortalUrl: "https://partner.swiggy.com",
    officialPortalName: "Swiggy Partner Portal",
    webhookPath: "/api/webhooks/aggregators/swiggy",
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
    name: "Zomato Food Delivery Bridge",
    category: "Ordering",
    connectionMode: "PARTNER_ONBOARDING",
    tagline: "Direct POS Order Relay, Rider Dispatch Tracking & Live Menu Sync",
    description:
      "Official Zomato restaurant partner integration. Automatic order ingestion, kitchen order tickets, rider assignment alerts, and menu item availability synchronization.",
    officialPortalUrl: "https://www.zomato.com/business",
    officialPortalName: "Zomato for Business",
    webhookPath: "/api/webhooks/aggregators/zomato",
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
    category: "Ordering",
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
    provider: "accounting",
    name: "Tally Prime & Tally.ERP 9 XML",
    category: "Accounting",
    connectionMode: "DATA_EXPORT",
    tagline: "Direct XML Voucher Export for Sales, Taxes & Payment Tenders",
    description:
      "Export daily sales revenue, CGST/SGST tax breakdown, payment tenders (Cash, UPI, Cards), and day-end registers formatted for direct import into Tally Prime XML.",
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
    provider: "zoho_books",
    name: "Zoho Books & Excel CSV",
    category: "Accounting",
    connectionMode: "DATA_EXPORT",
    tagline: "Standardized CSV Export for Sales Registers, GST & Item Margins",
    description:
      "Generate comprehensive accounting CSV exports tailored for Zoho Books, QuickBooks, or custom accounting systems. Includes item consumption, taxes, and payment audit logs.",
    officialPortalUrl: "https://www.zoho.com/books/",
    officialPortalName: "Zoho Books Integration",
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
    case "SETUP_IN_PROGRESS":
      return {
        text: "Setup In Progress",
        color: "#2563EB",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
        description: "Integration onboarding underway. Complete pending configuration steps.",
      };
    case "PROVIDER_APPROVAL_REQUIRED":
      return {
        text: "Partner Approval Required",
        color: "#D97706",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-300",
        description: "Official partner merchant agreement and API approval required from aggregator.",
      };
    case "CREDENTIALS_PENDING":
      return {
        text: "Credentials Pending",
        color: "#D97706",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        description: "Awaiting official provider API authentication details and secrets.",
      };
    case "CREDENTIALS_CONFIGURED":
      return {
        text: "Credentials Configured",
        color: "#2563EB",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
        description: "API authentication secured in AES-256 vault. Complete outlet mappings.",
      };
    case "OUTLET_MAPPING_PENDING":
      return {
        text: "Outlet Mapping Pending",
        color: "#7C3AED",
        badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
        description: "Assign external store/restaurant IDs to RestroNex physical outlets.",
      };
    case "WEBHOOK_CONFIGURATION_PENDING":
      return {
        text: "Webhook Config Pending",
        color: "#D97706",
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
        description: "Register webhook URL and secret in provider developer portal.",
      };
    case "VERIFICATION_FAILED":
      return {
        text: "Verification Failed",
        color: "#DC2626",
        badgeClass: "bg-red-50 text-red-700 border-red-200",
        description: "Cryptographic signature or provider identity check failed.",
      };
    case "DISABLED":
      return {
        text: "Disabled",
        color: "#718078",
        badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
        description: "Integration temporarily disabled by restaurant administrator.",
      };
    case "NOT_CONNECTED":
      return {
        text: "Not Connected",
        color: "#718078",
        badgeClass: "bg-[#F8FAF9] text-[#718078] border-[#E5EBE7]",
        description: "No connection established. Click connect to link your restaurant.",
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
