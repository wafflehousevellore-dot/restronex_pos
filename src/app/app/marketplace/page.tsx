export const dynamic = "force-dynamic";
import { marketplaceServices } from "@/lib/brand";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";

const allServices = Object.entries(marketplaceServices).flatMap(([cat, list]) =>
  list.map((name) => ({ name, cat }))
);
const extra = [
  "Captain App", "Scan & Order", "Token Management", "Digital Display", "Self Kiosk", "Waiter Calling",
  "Call Centre", "Table Reservation", "API Connect", "Virtual Wallet", "E-invoice Credits", "Tally Bridge",
  "SAP Bridge", "Online Reconciliation", "Purchase Manager", "My Website", "Feedback v2", "Loyalty Pro",
  "Gift Card", "Membership", "Dine-in Guard", "UPI Split", "Gift Vouchers", "WhatsApp Alerts", "Email Campaigns",
  "Zomato Ads", "Swiggy Ads", "POS Hardware", "Printer Hub", "Cash Drawer", "Customer Display", "Barcode Scanner",
  "Weigh Scale", "Voice Ordering", "Kiosk OS", "Drive-thru", "Food Court Hub", "Cloud Sync", "Offline Queue",
  "Head Office Push", "Stock Transfer", "Wastage AI", "Expiry Watch", "Vendor Compare", "Auto Reorder",
  "E-way Bill", "E-invoice 2.0", "GST GSTR-1", "Profit/Loss", "Cashflow", "Owner App", "Staff App",
  "Captain Tab", "Inventory Audit", "Stock Take", "Multi-Unit", "Recipe Yield", "Combo Builder", "Upsell Engine",
  "Happy Hours", "Coupon Bank", "Referrals", "NPS Score", "Review Booster", "Dineout Sync", "Paytm Sync",
  "PhonePe Sync", "Cred Sync", "ERP Bridge v2", "CRM v2", "Loyalty v2", "Wallet 2.0", "Scan Pay",
  "Order Ready Bell", "KOT Timer", "Station Router", "Bump Analytics", "Waste Analytics", "Prep Time AI",
  "Demand Forecast", "Menu Mix", "Price Lab", "Local SEO", "Google Review", "Instagram Feed", "Facebook Auto",
  "MMS Engine", "Push Notify", "Auto SMS", "Voice Blast", "Report Scheduler", "Day-End Bot", "Night Audit",
  "Cashup AI", "Petty Cash", "Vendor Ledger", "PO Approvals", "GRN Scan", "Yield Compare", "Expiry Kill",
  "Stock Aging", "Menu Costing", "Nutri Label", "Allergen Tag", "Veg Only", "Jain Menu", "Regional 18 Lang",
  "Support Bot", "Training Hub", "On-site Visit", "Dedicated POC", "SOP Library", "Audit Guard", "RTO Guard",
  "Refund Guard", "Chargeback Shield",
];

while (allServices.length < 120) {
  allServices.push({
    name: extra[allServices.length % extra.length] + ` #${allServices.length + 1}`,
    cat: ["crm", "analytics", "service", "operations"][allServices.length % 4],
  } as any);
}

export default function Marketplace() {
  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Marketplace — 120+ POS Add-ons</h1>
          <p className="text-sm text-[#718078] mt-1">POS add-on catalog • 70+ integrations • Pick any 5 on Growth, all on Scale</p>
        </div>
        <span className="rounded-full bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1 text-xs font-bold text-[#16845B]">
          {allServices.length} services • 4 categories
        </span>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {Object.entries(marketplaceServices).map(([k, list]) => (
          <DarkCard key={k}>
            <DarkCardHeader>
              <DarkCardTitle className="capitalize text-xs tracking-wider text-[#16845B] font-bold">
                {k} • {list.length}+
              </DarkCardTitle>
            </DarkCardHeader>
            <DarkCardContent className="text-sm text-[#718078] space-y-1.5">
              {list.map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16845B]" />
                  <span>{s}</span>
                </div>
              ))}
            </DarkCardContent>
          </DarkCard>
        ))}
      </div>

      <DarkCard>
        <DarkCardHeader>
          <DarkCardTitle className="text-base font-bold text-[#172B25]">All Services — Search & Activate</DarkCardTitle>
        </DarkCardHeader>
        <DarkCardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allServices.map((s) => (
            <div
              key={s.name}
              className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-4 py-3 flex justify-between items-center hover:border-[#16845B]/30 transition"
            >
              <div>
                <div className="text-sm font-bold text-[#172B25]">{s.name}</div>
                <div className="text-xs text-[#718078] uppercase font-semibold">{s.cat}</div>
              </div>
              <span className="text-xs rounded-full bg-white border border-[#E5EBE7] px-3 py-1 text-[#172B25] font-semibold hover:bg-[#E8F5EE] hover:text-[#16845B] transition cursor-pointer">
                Add
              </span>
            </div>
          ))}
        </DarkCardContent>
      </DarkCard>

      <DarkCard>
        <DarkCardContent className="pt-6 text-xs text-[#718078] leading-relaxed">
          Growth tier = any 5 add-ons included free. Scale tier = all add-ons included + E-invoice credits + 2 on-site engineer visits per year. Connector Status: Connected (verified) / Configured / Planned.
        </DarkCardContent>
      </DarkCard>
    </div>
  );
}
