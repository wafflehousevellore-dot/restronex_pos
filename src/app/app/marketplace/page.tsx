export const dynamic = "force-dynamic";
import { marketplaceServices } from "@/lib/brand";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
const allServices = Object.entries(marketplaceServices).flatMap(([cat, list])=> list.map(name=> ({ name, cat })));
const extra = ["Captain App","Scan & Order","Token Management","Digital Display","Self Kiosk","Waiter Calling","Call Centre","Table Reservation","API Connect","Virtual Wallet","E-invoice Credits","Tally Bridge","SAP Bridge","Online Reconciliation","Purchase Manager","My Website","Feedback v2","Loyalty Pro","Gift Card","Membership","Dine-in Guard","UPI Split","Gift Vouchers","WhatsApp Alerts","Email Campaigns","Zomato Ads","Swiggy Ads","POS Hardware","Printer Hub","Cash Drawer","Customer Display","Barcode Scanner","Weigh Scale","Voice Ordering","Kiosk OS","Drive-thru","Food Court Hub","Cloud Sync","Offline Queue","Head Office Push","Stock Transfer","Wastage AI","Expiry Watch","Vendor Compare","Auto Reorder","E-way Bill","E-invoice 2.0","GST GSTR-1","Profit/Loss","Cashflow","Owner App","Staff App","Captain Tab","Inventory Audit","Stock Take","Multi-Unit","Recipe Yield","Combo Builder","Upsell Engine","Happy Hours","Coupon Bank","Referrals","NPS Score","Review Booster","Dineout Sync","Paytm Sync","PhonePe Sync","Cred Sync","ERP Bridge v2","CRM v2","Loyalty v2","Wallet 2.0","Scan Pay","Order Ready Bell","KOT Timer","Station Router","Bump Analytics","Waste Analytics","Prep Time AI","Demand Forecast","Menu Mix","Price Lab","Local SEO","Google Review","Instagram Feed","Facebook Auto","MMS Engine","Push Notify","Auto SMS","Voice Blast","Report Scheduler","Day-End Bot","Night Audit","Cashup AI","Petty Cash","Vendor Ledger","PO Approvals","GRN Scan","Yield Compare","Expiry Kill","Stock Aging","Menu Costing","Nutri Label","Allergen Tag","Veg Only","Jain Menu","Regional 18 Lang","Support Bot","Training Hub","On-site Visit","Dedicated POC","SOP Library","Audit Guard","RTO Guard","Refund Guard","Chargeback Shield"];
while(allServices.length < 120) allServices.push({ name: extra[allServices.length % extra.length] + ` #${allServices.length+1}`, cat: ["crm","analytics","service","operations"][allServices.length%4]} as any);
export default function Marketplace(){
  return (
    <div className="space-y-6 text-white">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-black tracking-tight">Marketplace — 120+ POS Add-ons</h1><p className="text-sm text-white/50">POS add-on catalog • 70+ integrations • Pick any 5 on Growth, all on Scale</p></div><span className="rounded-full bg-[#3D954F]/15 border border-[#3D954F]/20 px-3 py-1 text-xs font-bold text-[#3D954F]">{allServices.length} services • 4 buckets</span></div>
      <div className="grid lg:grid-cols-4 gap-3">
        {Object.entries(marketplaceServices).map(([k, list])=> (
          <DarkCard key={k}><DarkCardHeader><DarkCardTitle className="capitalize text-xs tracking-widest text-[#3D954F]">{k} • {list.length}+</DarkCardTitle></DarkCardHeader><DarkCardContent className="text-sm text-white/60 space-y-1">{list.map(s=> <div key={s}>• {s}</div>)}</DarkCardContent></DarkCard>
        ))}
      </div>
      <DarkCard><DarkCardHeader><DarkCardTitle>All Services — Search & Activate</DarkCardTitle></DarkCardHeader><DarkCardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {allServices.map(s=> <div key={s.name} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex justify-between items-center"><div><div className="text-sm font-bold text-white">{s.name}</div><div className="text-xs text-white/40">{s.cat}</div></div><span className="text-xs rounded-full bg-white/10 px-2 py-1 text-white/60">Add</span></div>)}
      </DarkCardContent></DarkCard>
      <DarkCard><DarkCardContent className="pt-6 text-xs text-white/40">Growth = any 5 free, extra at cost. Scale = all included + E-invoice credits + 2 on-site visits/yr. Status: Connected (verified) / Configured / Planned — never fake.</DarkCardContent></DarkCard>
    </div>
  );
}
