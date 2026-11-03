export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DemoRequestsAdmin(){
  const list = await prisma.demoRequest.findMany({ orderBy:{ createdAt:"desc"}});

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black text-[#172B25]">Demo Requests Pipeline</h1>
        <p className="text-sm text-[#718078]">Prospective restaurant operators requesting platform walkthroughs.</p>
      </div>

      <div className="grid gap-3.5">
        {list.map(d=> (
          <Card key={d.id} className="bg-white border-[#E5EBE7] shadow-xs">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-[#172B25] text-base">{d.name} • {d.restaurantName}</div>
                  <div className="text-sm text-[#718078] mt-0.5">{d.email} • {d.phone} • {d.city}</div>
                  <div className="text-xs text-[#718078] mt-1 italic">{d.message||"—"}</div>
                </div>
                <Badge variant="secondary" className="bg-[#E8F5EE] text-[#16845B] border-[#E5EBE7] self-start sm:self-center">
                  {d.status}
                </Badge>
              </div>
              <div className="text-xs text-[#718078] mt-2 pt-2 border-t border-[#E5EBE7]">
                Requested: {new Date(d.createdAt).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length===0 && (
          <Card className="p-8 text-center bg-white border-[#E5EBE7]">
            <CardContent className="text-sm text-[#718078]">No demo requests recorded yet.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
