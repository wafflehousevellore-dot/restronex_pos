import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Settings(){
  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Restaurant Settings</h1>
        <p className="text-sm text-[#718078]">Tenant configurations, tax defaults, and security policies.</p>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Restaurant Settings & Legal</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#718078] space-y-2 leading-relaxed">
          <div>GST and FSSAI numbers, receipt header and footer notes, service charge percentages, KOT, and table layout preferences are saved directly to your RestaurantSetting record.</div>
          <div>Country, time zone, and currency are tenant-level attributes that feed into tax calculations, report time-bucketing, and minor-unit currency formatting.</div>
        </CardContent>
      </Card>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardHeader>
          <CardTitle className="text-[#172B25]">Security & Tenant Isolation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[#718078] leading-relaxed">
          Your tenant ID is derived securely from server-authenticated session tokens. All monetary and stock movements run in atomic PostgreSQL transactions.
        </CardContent>
      </Card>
    </div>
  );
}
