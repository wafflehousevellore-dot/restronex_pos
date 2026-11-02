export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plug, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

export default async function PlatformIntegrationsPage() {
  const configs = await prisma.integrationConfig.findMany({
    include: { tenant: { select: { name: true, slug: true } } },
    orderBy: { lastSyncAt: "desc" },
    take: 50,
  });

  const webhookEvents = await prisma.webhookEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const totalConnected = configs.filter((c) => c.status === "CONNECTED").length;
  const totalError = configs.filter((c) => c.status === "ERROR").length;

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#172B25]">Platform Integrations & Webhook Hub</h1>
          <p className="text-sm text-[#718078]">System-wide third-party connectors, API endpoints & webhook health.</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-[#E8F5EE] text-[#16845B] border-[#E5EBE7]">
            {totalConnected} Active Connectors
          </Badge>
          {totalError > 0 && (
            <Badge className="bg-red-50 text-red-600 border-red-200">
              {totalError} Error States
            </Badge>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Supported Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#172B25]">6 Providers</div>
            <div className="text-xs text-[#718078] mt-1">Razorpay, Swiggy, Zomato, DotPe, Logistics, Tally</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Webhook Idempotency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#16845B]">100% Enforced</div>
            <div className="text-xs text-[#718078] mt-1">Unique eventId constraint on WebhookEvent</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-wider text-[#718078]">Secret Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-[#16845B]">HMAC-SHA256</div>
            <div className="text-xs text-[#718078] mt-1">Server-side payload signature verification</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25]">Tenant Integration Statuses</CardTitle>
          </CardHeader>
          <CardContent>
            {configs.length === 0 ? (
              <div className="text-sm text-[#718078] py-6 text-center">No tenant integrations configured yet.</div>
            ) : (
              <div className="space-y-2.5">
                {configs.map((c) => (
                  <div key={c.id} className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E5EBE7] flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-[#172B25] capitalize">{c.provider}</div>
                      <div className="text-[#718078]">{c.tenant.name}</div>
                    </div>
                    <Badge variant="secondary" className="bg-[#E8F5EE] text-[#16845B] border-[#E5EBE7]">
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25]">Recent Webhook Audits</CardTitle>
          </CardHeader>
          <CardContent>
            {webhookEvents.length === 0 ? (
              <div className="text-sm text-[#718078] py-6 text-center">No webhook events logged yet.</div>
            ) : (
              <div className="space-y-2">
                {webhookEvents.map((evt) => (
                  <div key={evt.id} className="p-3 bg-[#F8FAF9] rounded-lg border border-[#E5EBE7] flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-[#172B25]">{evt.provider}</span>
                      <span className="text-[#718078] ml-2 font-mono text-[10px]">{evt.eventId}</span>
                    </div>
                    <span className="text-[#16845B] text-xs font-semibold">Processed ✓</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
