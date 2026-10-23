import { Card, DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export default function StaffPage(){
  const roles=[
    { role:"OWNER", desc:"Business profile, outlets, billing, all reports" },
    { role:"HEAD_OFFICE", desc:"Central menu, pricing, outlet compare, consolidated reports" },
    { role:"OUTLET_MANAGER", desc:"Assigned outlet: shifts, orders, menu availability, inventory, staff" },
    { role:"CASHIER", desc:"Orders, discounts (permitted), payments, receipts, shifts — no admin" },
    { role:"KITCHEN", desc:"Kitchen tickets, prep status only" },
    { role:"WAITER", desc:"Assigned tables, create orders, send to kitchen" },
    { role:"INVENTORY", desc:"Stock, movements, suppliers, PO, transfers" },
  ];
  return (
    <div className="space-y-6 text-white">
      <h1 className="text-xl font-black text-white">Staff & Roles — RBAC</h1>
      <DarkCard><DarkCardContent className="pt-6 text-sm text-white/60">Staff are Memberships linking User ↔ Tenant (+ optional Outlet). Invite via /api/staff (not shown) with role; server enforces outlet-level permissions. Platform admin is separate (isPlatformAdmin flag, server-side check — never client metadata).</DarkCardContent></DarkCard>
      <div className="grid sm:grid-cols-2 gap-4">
        {roles.map(r=> <DarkCard key={r.role}><DarkCardHeader><DarkCardTitle className="flex justify-between">{r.role} <Badge variant="secondary">{r.role}</Badge></DarkCardTitle></DarkCardHeader><DarkCardContent className="text-sm text-white/60">{r.desc}</DarkCardContent></DarkCard>)}
      </div>
    </div>
  );
}
