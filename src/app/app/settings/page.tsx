import { Card, DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function Settings(){
  return (
    <div className="space-y-6 text-white">
      <h1 className="text-xl font-black text-white">Settings</h1>
      <DarkCard><DarkCardHeader><DarkCardTitle>Restaurant Settings</DarkCardTitle></DarkCardHeader><DarkCardContent className="text-sm text-white/60 space-y-1"><div>GST / FSSAI numbers, receipt header/footer, service charge %, KOT & table management toggles — persisted in RestaurantSetting (tenantId unique).</div><div>Country, timezone, currency are tenant-level and thread through tax calcs and formatting.</div></DarkCardContent></DarkCard>
      <DarkCard><DarkCardHeader><DarkCardTitle>Security</DarkCardTitle></DarkCardHeader><DarkCardContent className="text-sm text-white/60">Tenant ID comes from authenticated membership, never client. All financial/inventory changes use DB transactions. Audit logs on sensitive ops. Rate limiting recommended for public endpoints.</DarkCardContent></DarkCard>
    </div>
  );
}
