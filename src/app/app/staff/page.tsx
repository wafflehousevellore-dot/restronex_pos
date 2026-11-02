import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StaffPage(){
  const roles=[
    { role:"OWNER", desc:"Business profile, outlets, subscription, tax, all reports" },
    { role:"HEAD_OFFICE", desc:"Central menu, pricing distribution, multi-outlet comparison, consolidated reports" },
    { role:"OUTLET_MANAGER", desc:"Assigned outlet: shifts, orders, menu availability, inventory, staff management" },
    { role:"CASHIER", desc:"Counter orders, bill settlement, payments, receipts, register shifts" },
    { role:"KITCHEN", desc:"Kitchen tickets, prep station status and ticket bump workflows" },
    { role:"WAITER", desc:"Tableside order punching, table assignment, sending KOT to kitchen" },
    { role:"INVENTORY", desc:"Stock tracking, goods receipts, supplier price comparisons, purchase orders" },
  ];

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Staff & Role-Based Access Control (RBAC)</h1>
        <p className="text-sm text-[#718078]">Granular permissions enforced server-side. Memberships link Users to Tenants and Outlets.</p>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardContent className="pt-6 text-sm text-[#718078] leading-relaxed">
          Staff roles are enforced server-side at the route and database layer. Roles prevent unauthorized discount application, voids, or metric inspection.
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {roles.map(r=> (
          <Card key={r.role} className="bg-white border-[#E5EBE7] shadow-xs hover:border-[#16845B] transition">
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center text-[#172B25] text-base">
                <span>{r.role}</span>
                <span className="rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-2.5 py-0.5 text-xs font-bold text-[#16845B]">
                  Role
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-[#718078] leading-relaxed">
              {r.desc}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
