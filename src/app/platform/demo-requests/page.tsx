export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
export default async function DemoRequestsAdmin(){
  const list = await prisma.demoRequest.findMany({ orderBy:{ createdAt:"desc"}});
  return (
    <div className="space-y-4 text-white">
      <h1 className="text-xl font-black text-white">Demo Requests — validated & persisted</h1>
      {list.map(d=> <DarkCard key={d.id}><DarkCardContent className="pt-5"><div className="flex justify-between"><div><div className="font-semibold">{d.name} • {d.restaurantName}</div><div className="text-sm text-white/60">{d.email} • {d.phone} • {d.city}</div><div className="text-sm text-white/50">{d.message||"—"}</div></div><Badge>{d.status}</Badge></div><div className="text-xs text-white/40 mt-1">{new Date(d.createdAt).toLocaleString()}</div></DarkCardContent></DarkCard>)}
      {list.length===0 && <DarkCard><DarkCardContent className="pt-6 text-sm text-white/50">No demo requests yet.</DarkCardContent></DarkCard>}
    </div>
  );
}
