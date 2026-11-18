"use client";

import React, { useState } from "react";
import {
  X,
  CreditCard,
  MessageSquare,
  Printer,
  ShoppingBag,
  FileSpreadsheet,
  CheckCircle2,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  Zap,
} from "lucide-react";

export type GuideKey = "razorpay" | "whatsapp" | "printer" | "aggregators" | "accounting";

export interface GuideStep {
  num: number;
  title: string;
  body: string;
  tip?: string;
  warning?: string;
  code?: string;
  codeLabel?: string;
  actionText?: string;
  providerKey?: string;
}

export interface GuideData {
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  bgColor: string;
  totalSteps: number;
  prerequisites: string[];
  steps: GuideStep[];
  troubleshooting: { q: string; a: string }[];
}

interface SetupGuideProps {
  initialGuide?: GuideKey;
  isOpen: boolean;
  onClose: () => void;
  onOpenConfigure?: (provider: string) => void;
  domainUrl?: string;
}

export default function IntegrationSetupGuidesModal({
  initialGuide = "razorpay",
  isOpen,
  onClose,
  onOpenConfigure,
  domainUrl,
}: SetupGuideProps) {
  const [activeGuide, setActiveGuide] = useState<GuideKey>(initialGuide);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin = domainUrl || (typeof window !== "undefined" ? window.location.origin : "https://www.restronexpos.com");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const guides: Record<GuideKey, GuideData> = {
    razorpay: {
      title: "Razorpay Payment Gateway Setup",
      subtitle: "Accept Cards, NetBanking, UPI & Wallets with automated server-side reconciliation",
      icon: CreditCard,
      color: "text-[#16845B]",
      bgColor: "bg-emerald-50 border-emerald-200",
      totalSteps: 9,
      prerequisites: [
        "Active Registered Business / Merchant entity in India",
        "Completed Razorpay Business KYC and Bank Account Verification",
        "Owner permissions on both Razorpay and RestroNex",
      ],
      steps: [
        {
          num: 1,
          title: "Create Razorpay Account & Complete KYC",
          body: "Sign up at dashboard.razorpay.com using your business credentials. Complete your corporate / proprietorship KYC and link your verified current bank account for automated T+1 settlements.",
          tip: "Razorpay automatically verifies GSTIN and bank penny-drop within 24-48 business hours.",
        },
        {
          num: 2,
          title: "Navigate to API Keys in Razorpay Dashboard",
          body: "Log in to your Razorpay Dashboard. From the left sidebar, navigate to Settings → API Keys. Ensure you switch the top bar toggle to 'Live Mode'.",
          tip: "Never generate keys in Test Mode for live customer payments.",
        },
        {
          num: 3,
          title: "Generate Live Key ID & Key Secret",
          body: "Click 'Generate Key'. Razorpay will display your Key ID (e.g. rzp_live_xxxxxxxxxxxx) and Key Secret (a 24-character cryptographic token). Copy both immediately.",
          warning: "Razorpay displays the Key Secret only once upon generation. Store it securely.",
        },
        {
          num: 4,
          title: "Paste Credentials into RestroNex Settings",
          body: "Open RestroNex POS Integrations Hub → Razorpay → Configure. Paste your Key ID and Key Secret. RestroNex automatically encrypts the secret on the server using AES-256-GCM.",
          actionText: "Configure Razorpay Now",
          providerKey: "razorpay",
        },
        {
          num: 5,
          title: "Configure Webhooks in Razorpay Dashboard",
          body: "In Razorpay Dashboard, navigate to Settings → Webhooks → Add New Webhook. In the Webhook URL field, paste your restaurant's dedicated production webhook URL.",
          code: `${origin}/api/webhooks/razorpay`,
          codeLabel: "Razorpay Webhook URL",
        },
        {
          num: 6,
          title: "Select Required Webhook Events",
          body: "Under Active Events in Razorpay, select: payment.captured, payment.failed, and order.paid. These allow RestroNex to verify settlement status instantly without customer page reloads.",
          tip: "Selecting only required events prevents unnecessary server traffic and ensures fastest webhook delivery.",
        },
        {
          num: 7,
          title: "Set Webhook Secret & Enter in RestroNex",
          body: "Enter a high-entropy secret in Razorpay's 'Secret' field (e.g. a random 32-character string). Copy this secret and paste it into RestroNex's 'Webhook Signing Secret' field. RestroNex uses this to cryptographically verify HMAC-SHA256 signatures on every incoming event.",
        },
        {
          num: 8,
          title: "Verify Connection with Micro-Transaction",
          body: "Click 'Test Connection' or initiate a ₹1 live payment via RestroNex contactless QR. Verify that the order transitions automatically to PAID in POS billing terminal.",
          tip: "You can issue an instant full refund for the ₹1 test payment directly from the RestroNex Payments tab.",
        },
        {
          num: 9,
          title: "Enable Razorpay on POS Checkout Screen",
          body: "Toggle 'Enable Online Payments' in RestroNex settings. Cashiers and self-order table QR menus can now accept Razorpay payments seamlessly.",
        },
      ],
      troubleshooting: [
        {
          q: "Error: 401 Authentication Failed when saving keys",
          a: "Verify that you copied the Key Secret accurately without extra spaces, and confirm that your Razorpay account is in Live Mode.",
        },
        {
          q: "Payments succeed on customer phone but remain pending in POS",
          a: "Confirm your Webhook URL is set to https://<domain>/api/webhooks/razorpay and that your Webhook Signing Secret in RestroNex matches Razorpay exactly.",
        },
      ],
    },

    whatsapp: {
      title: "Meta WhatsApp Business API Setup",
      subtitle: "Official Meta Cloud API integration for automated digital receipts and customer notifications",
      icon: MessageSquare,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 border-emerald-200",
      totalSteps: 10,
      prerequisites: [
        "A dedicated business phone number NOT currently registered on personal WhatsApp app",
        "Meta Business Manager account (business.facebook.com)",
        "Meta for Developers account (developers.facebook.com)",
      ],
      steps: [
        {
          num: 1,
          title: "Create a Meta Business Manager Account",
          body: "Visit business.facebook.com. Create a Business Manager account for your restaurant and verify your official business name and email address.",
          tip: "Completing Meta Business Verification grants unlimited daily messaging tiers.",
        },
        {
          num: 2,
          title: "Set up a Meta Developer App for WhatsApp",
          body: "Go to developers.facebook.com → My Apps → Create App. Select 'Other' → 'Business' as the app type. Add the 'WhatsApp' product to your app.",
        },
        {
          num: 3,
          title: "Add Restaurant Phone Number to WhatsApp API",
          body: "Under WhatsApp → API Setup, click 'Add Phone Number'. Enter your restaurant's billing desk or official mobile number. Complete OTP verification via SMS or voice call.",
          warning: "If this number is currently used on the WhatsApp mobile app, you must delete the WhatsApp account from mobile settings first to release it for Cloud API.",
        },
        {
          num: 4,
          title: "Generate Permanent System User Access Token",
          body: "In Meta Business Settings → Users → System Users, create an Admin System User. Assign the WhatsApp app with full 'whatsapp_business_messaging' and 'whatsapp_business_management' permissions. Generate a permanent token.",
          tip: "Never use the 24-hour temporary token from API Setup for production billing.",
        },
        {
          num: 5,
          title: "Copy Phone Number ID, WABA ID & Token into RestroNex",
          body: "From WhatsApp API Setup, copy your 'Phone Number ID' and 'WhatsApp Business Account ID (WABA ID)'. Paste them along with your Permanent System User Token into RestroNex WhatsApp Settings.",
          actionText: "Configure WhatsApp Settings",
          providerKey: "whatsapp",
        },
        {
          num: 6,
          title: "Configure Webhook in Meta Developer Portal",
          body: "In your Meta Developer App, go to WhatsApp → Configuration. Click 'Edit' under Webhook. Enter your RestroNex webhook URL and set your Webhook Verify Token.",
          code: `${origin}/api/webhooks/whatsapp`,
          codeLabel: "WhatsApp Webhook Callback URL",
        },
        {
          num: 7,
          title: "Verify Webhook & Subscribe to 'messages' Field",
          body: "Click 'Verify and Save' in Meta. Once verified, click 'Manage Webhook Fields' and subscribe to 'messages'. This allows RestroNex to track message delivery and read receipts in real time.",
        },
        {
          num: 8,
          title: "Submit Message Templates for Approval",
          body: "In WhatsApp Manager → Message Templates, submit your transaction receipt template (Category: UTILITY). RestroNex provides pre-approved template structures for bills, KOTs, and table confirmations.",
          tip: "Utility templates are approved by Meta AI within 1-5 minutes and enjoy the lowest per-message Meta rates.",
        },
        {
          num: 9,
          title: "Send Live Test Message to Your Phone",
          body: "In RestroNex WhatsApp Settings, enter your personal mobile number (with country code, e.g. +91 98765 43210) and click 'Send Test Message'. Confirm physical message delivery on your phone.",
        },
        {
          num: 10,
          title: "Enable Automated Bill Sharing on Checkout",
          body: "Toggle 'Auto-Send WhatsApp Invoice on Paid Orders'. Every time an order is settled at the POS counter or table, a branded PDF bill is automatically dispatched to the customer's mobile number.",
        },
      ],
      troubleshooting: [
        {
          q: "Error: (#100) Param to must be a valid WhatsApp user",
          a: "Ensure the customer mobile number includes the country code without plus signs or spaces (e.g. 919876543210 for India).",
        },
        {
          q: "Messages fail with 'User Token Expired'",
          a: "You generated a temporary 24-hour developer token instead of a Permanent System User Token. Follow Step 4 to generate a permanent token.",
        },
      ],
    },

    printer: {
      title: "Thermal Receipt & Kitchen KOT Printer Setup",
      subtitle: "ESC/POS 80mm & 58mm high-speed printing across Network LAN, USB, and Bluetooth",
      icon: Printer,
      color: "text-blue-600",
      bgColor: "bg-blue-50 border-blue-200",
      totalSteps: 10,
      prerequisites: [
        "ESC/POS compatible thermal receipt printer (e.g. Epson, Star, TVS, NGX, Everycom, Retsol)",
        "Standard thermal paper roll (80mm standard or 58mm compact)",
        "Local network router / Wi-Fi network (for LAN printers) or USB cable / Bluetooth device",
      ],
      steps: [
        {
          num: 1,
          title: "Choose Printer Connection Interface",
          body: "RestroNex supports 3 hardware interfaces: (1) Network LAN/Ethernet (recommended for multi-station kitchens), (2) Direct USB via browser WebUSB, (3) Bluetooth for mobile billing terminals.",
        },
        {
          num: 2,
          title: "For Network LAN: Print Self-Test Slip for IP",
          body: "Connect your thermal printer to your restaurant Wi-Fi router via Ethernet cable. Turn off the printer, hold down the 'FEED' button, turn on the power switch, and release after 2 seconds. The printer will print a self-test diagnostic slip displaying its current IP address (e.g. 192.168.1.100).",
          tip: "Set a static IP or DHCP IP reservation in your router so the printer IP never changes.",
        },
        {
          num: 3,
          title: "For USB Printers: Connect & Authorize WebUSB",
          body: "Plug the printer into your POS terminal via USB cable. In Google Chrome or RestroNex Desktop app, click 'Add USB Printer' and grant browser WebUSB access to the device.",
        },
        {
          num: 4,
          title: "For Bluetooth Printers: Pair in OS Settings",
          body: "Turn on the Bluetooth printer. In your device Settings → Bluetooth, pair with the printer (default PIN: 0000 or 1234). Then click 'Discover Bluetooth' in RestroNex.",
        },
        {
          num: 5,
          title: "Select Paper Size (80mm vs 58mm)",
          body: "Select 80mm (3-inch, standard 48-character bill with full item descriptions and tax breakdown) or 58mm (2-inch, compact 32-character slip). RestroNex formats ESC/POS commands dynamically for exact width.",
        },
        {
          num: 6,
          title: "Assign Printer Station Role",
          body: "Assign the printer to its designated role: (1) Main Billing Counter, (2) Kitchen Station 1 (Hot Food KOT), (3) Kitchen Station 2 (Cold Food / Bar KOT). RestroNex automatically splits multi-item orders to their assigned kitchen stations.",
          actionText: "Configure Printers in RestroNex",
          providerKey: "printer",
        },
        {
          num: 7,
          title: "Configure IP Address & RAW Port (9100)",
          body: "Enter the printer's local IP address and raw socket port (default standard: 9100). For USB devices, select the vendor device ID from the dropdown.",
        },
        {
          num: 8,
          title: "Customize Receipt Header & Footer",
          body: "Configure restaurant header text, registered GSTIN, FSSAI license number, address, table number, cashier name, and custom thank-you footer message.",
        },
        {
          num: 9,
          title: "Click 'Test Print' to Verify Physical Printing",
          body: "Click 'Test Print' in RestroNex. The printer should immediately feed, print a diagnostic alignment slip with date, time, and paper test cut, and execute an automated paper cut (or drawer kick if cash drawer is attached).",
        },
        {
          num: 10,
          title: "Enable Auto-Print on POS Order & KOT Firing",
          body: "Toggle 'Auto-Print Customer Receipt on Payment' and 'Auto-Print KOT on Kitchen Fire'. Orders placed by waiters or table QR guests will now print automatically without cashier intervention.",
        },
      ],
      troubleshooting: [
        {
          q: "Printer fails to print over LAN (Connection Timeout)",
          a: "Verify that the POS terminal device and the printer are connected to the EXACT same local Wi-Fi router / subnet. Ping the printer IP from terminal to confirm connectivity.",
        },
        {
          q: "Printed text appears as garbled symbols or random characters",
          a: "Confirm the printer supports standard ESC/POS command protocol. Most modern 80mm/58mm thermal printers support ESC/POS natively.",
        },
      ],
    },

    aggregators: {
      title: "Online Ordering (Swiggy & Zomato) Setup",
      subtitle: "Official merchant partner onboarding, multi-outlet store mapping, and menu synchronization",
      icon: ShoppingBag,
      color: "text-orange-600",
      bgColor: "bg-orange-50 border-orange-200",
      totalSteps: 8,
      prerequisites: [
        "Active Swiggy Restaurant Partner merchant account (partner.swiggy.com)",
        "Active Zomato for Business merchant account (zomato.com/business)",
        "Valid FSSAI license and GSTIN certificate linked to aggregator listings",
      ],
      steps: [
        {
          num: 1,
          title: "Check Partner Eligibility & Active Listings",
          body: "Confirm that your restaurant is active, live, and accepting orders on Swiggy and Zomato customer apps. Ensure your FSSAI license is up to date on both partner portals.",
        },
        {
          num: 2,
          title: "Apply for POS Integration with Aggregator Support",
          body: "Contact your Swiggy Point of Contact (POC) / Swiggy Partner Helpdesk and request POS Integration. On Zomato, raise a ticket via Zomato Restaurant Partner App under 'POS Integration Request'. Inform them that you are using RestroNex Restaurant OS.",
          tip: "Swiggy and Zomato officially require merchant agreement sign-off before releasing API tokens.",
        },
        {
          num: 3,
          title: "Receive Partner API Credentials & Store IDs",
          body: "Aggregator technical support will issue your Merchant ID, Outlet/Store ID (Res ID on Zomato, Store ID on Swiggy), and a secure API Client Token / Signing Secret.",
        },
        {
          num: 4,
          title: "Enter Merchant & Store IDs in RestroNex",
          body: "Open RestroNex Online Integrations → Swiggy or Zomato tab. Enter your Merchant ID and Store IDs. RestroNex encrypts all aggregator tokens securely on the server.",
          actionText: "Open Online Ordering Console",
          providerKey: "swiggy",
        },
        {
          num: 5,
          title: "Provide RestroNex Webhook URLs to Aggregators",
          body: "Provide your dedicated RestroNex webhook URLs to Swiggy and Zomato partner technical onboarding teams. They will configure these endpoints in their order dispatch relays.",
          code: `${origin}/api/webhooks/aggregators/swiggy`,
          codeLabel: "Swiggy Production Webhook URL",
        },
        {
          num: 6,
          title: "Map RestroNex Outlets to Aggregator Store Locations",
          body: "In RestroNex Outlet Mapping tab, link your physical restaurant branch to its corresponding Swiggy Store ID and Zomato Res ID. This ensures orders are automatically routed to the correct cashier desk.",
        },
        {
          num: 7,
          title: "Synchronize Master Menu & Pricing Markups",
          body: "Navigate to Menu Synchronisation. Choose your aggregator pricing strategy (e.g. 15% price hike to cover packaging/commissions) and click 'Push Menu Sync'. Review categories, items, and addon variants.",
        },
        {
          num: 8,
          title: "Request Provider Activation & Verify First Live Order",
          body: "Inform aggregator support to switch your store to POS Relay mode. When your first customer places an order on Swiggy or Zomato, it will ring loudly on POS, fire kitchen KOTs, and print thermal slips automatically.",
          tip: "Once activated, your status will change from 'PROVIDER APPROVAL REQUIRED' to 'CONNECTED (Live Production)'.",
        },
      ],
      troubleshooting: [
        {
          q: "Why does my status show 'PROVIDER APPROVAL REQUIRED'?",
          a: "Direct Swiggy and Zomato API access requires an active commercial contract with the aggregator. RestroNex is fully architected and ready; you simply need to request POS API enablement from your Swiggy/Zomato account manager.",
        },
        {
          q: "Aggregator order arrives but kitchen KOT does not print",
          a: "Ensure you mapped the incoming Store ID to an active outlet in RestroNex, and confirm that your KOT thermal printer is assigned to that outlet.",
        },
      ],
    },

    accounting: {
      title: "Accounting & ERP Export Setup (Tally / Zoho Books)",
      subtitle: "One-click TallyPrime XML voucher exports, GST tax breakdowns, and daily day-end registers",
      icon: FileSpreadsheet,
      color: "text-purple-600",
      bgColor: "bg-purple-50 border-purple-200",
      totalSteps: 6,
      prerequisites: [
        "TallyPrime or Tally.ERP 9 installed on accounting PC, or Zoho Books account",
        "Configured Chart of Accounts in Tally matching your restaurant ledger names",
      ],
      steps: [
        {
          num: 1,
          title: "Select Report Type & Export Frequency",
          body: "Navigate to RestroNex Accounting & Exports tab. Choose whether you want a Daily Sales Day-End Summary, Item-wise Sales Register, GST Tax Breakdown, or Expense Voucher report.",
        },
        {
          num: 2,
          title: "Select Date Range & Outlet Branch",
          body: "Filter by specific business day or date range. For multi-outlet businesses, select an individual branch or download consolidated organization-wide books.",
        },
        {
          num: 3,
          title: "Choose Export Format (Tally XML vs Excel / CSV)",
          body: "Select 'Tally XML' for direct import into TallyPrime / Tally.ERP 9 vouchers. Select 'Excel / CSV' for Zoho Books, QuickBooks, SAP, or manual spreadsheet analysis.",
        },
        {
          num: 4,
          title: "Configure Tally Ledger Names",
          body: "Customize your default ledger names in RestroNex to match your Tally Chart of Accounts: (1) Sales Ledger: 'Restaurant Food Sales', (2) CGST Ledger: 'Output CGST 9%', (3) SGST Ledger: 'Output SGST 9%', (4) Party Ledger: 'Cash / Counter POS'.",
          tip: "Matching ledger names exactly prevents voucher import rejection errors in Tally.",
        },
        {
          num: 5,
          title: "Download Verified XML / CSV File",
          body: "Click 'Export Vouchers'. RestroNex compiles paid orders, discounts, taxes, and tenders into a validated Tally XML envelope file named 'RestroNex_Tally_Sales_YYYY-MM-DD.xml'.",
          actionText: "Export Accounting Data Now",
          providerKey: "accounting",
        },
        {
          num: 6,
          title: "Import into TallyPrime (Import Data → Vouchers)",
          body: "Open your company in TallyPrime. From the top menu, click 'Import' (Alt+O) → 'Transactions' / 'Vouchers'. In File Format select 'XML', choose the downloaded RestroNex file, and press Enter. All daily sales, tax, and cash vouchers will be posted instantly.",
        },
      ],
      troubleshooting: [
        {
          q: "Tally displays 'Ledger does not exist' during import",
          a: "Ensure the ledger names configured in RestroNex settings exist in your Tally company master, or create the ledgers in Tally beforehand.",
        },
        {
          q: "Imported voucher totals differ by a few paise",
          a: "Enable 'Round-off Ledger' in RestroNex accounting settings to automatically absorb 50-paise rounding differentials.",
        },
      ],
    },
  };

  const currentGuideData = guides[activeGuide];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${currentGuideData.bgColor} ${currentGuideData.color} shadow-xs`}>
              <currentGuideData.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                  Step-by-Step Self-Service Integration Guide
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Production Ready
                </span>
              </div>
              <h2 className="text-xl font-black text-[#172B25]">{currentGuideData.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guide Switcher Tabs */}
        <div className="flex items-center gap-1.5 px-6 pt-3 pb-2 border-b border-gray-100 overflow-x-auto bg-gray-50/50">
          {[
            { key: "razorpay", label: "Razorpay (Payments)", icon: CreditCard },
            { key: "whatsapp", label: "Meta WhatsApp", icon: MessageSquare },
            { key: "printer", label: "Thermal Printers", icon: Printer },
            { key: "aggregators", label: "Swiggy & Zomato", icon: ShoppingBag },
            { key: "accounting", label: "Tally & Accounting", icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeGuide === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveGuide(tab.key as GuideKey);
                  setCurrentStep(1);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#16845B] text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Prerequisites Banner */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              Prerequisites Before You Begin
            </div>
            <ul className="text-xs text-amber-900/90 space-y-1 list-disc list-inside">
              {currentGuideData.prerequisites.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </div>

          {/* Stepper Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-600">
              <span>Step {currentStep} of {currentGuideData.totalSteps}</span>
              <span className="text-[#16845B]">
                {Math.round((currentStep / currentGuideData.totalSteps) * 100)}% Complete
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${(currentStep / currentGuideData.totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Current Step Card */}
          {(() => {
            const step = currentGuideData.steps[currentStep - 1];
            return (
              <div className="p-5 sm:p-6 rounded-2xl border border-gray-200 bg-white shadow-xs space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#16845B] text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
                    {step.num}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h3 className="text-lg font-bold text-[#172B25]">{step.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
                  </div>
                </div>

                {/* Optional copyable code / URL */}
                {step.code && (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                    <div className="text-[11px] font-bold text-gray-500 uppercase">{step.codeLabel || "Endpoint URL"}</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-900 font-mono flex-1 overflow-x-auto">
                        {step.code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(step.code!, step.codeLabel || "URL")}
                        className="px-3 py-2 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedText === (step.codeLabel || "URL") ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Tip */}
                {step.tip && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Pro Tip:</strong> {step.tip}</span>
                  </div>
                )}

                {/* Optional Warning */}
                {step.warning && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span><strong>Important:</strong> {step.warning}</span>
                  </div>
                )}

                {/* Action button if step has action */}
                {step.actionText && onOpenConfigure && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenConfigure(step.providerKey || activeGuide);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      {step.actionText} →
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Step
            </button>

            <button
              onClick={() => setCurrentStep((prev) => Math.min(currentGuideData.totalSteps, prev + 1))}
              disabled={currentStep === currentGuideData.totalSteps}
              className="px-5 py-2 rounded-xl bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Step Quick-jump Pills */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2">
            {currentGuideData.steps.map((s) => (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                  currentStep === s.num
                    ? "bg-[#16845B] text-white shadow-xs"
                    : currentStep > s.num
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
                title={s.title}
              >
                {s.num}
              </button>
            ))}
          </div>

          {/* Troubleshooting Section */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-gray-400" />
              Frequently Encountered Troubleshooting Scenarios
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentGuideData.troubleshooting.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                  <div className="font-bold text-[#172B25]">{item.q}</div>
                  <div className="text-gray-600 leading-relaxed">{item.a}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Need dedicated engineering assistance? Contact support@restronexpos.com
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
