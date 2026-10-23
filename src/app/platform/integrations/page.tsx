export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle } from "@/components/ui/card";
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Platform Integrations & Webhook Hub</h1>
          <p className="text-sm text-white/60">System-wide third-party connectors, API endpoints & webhook health.</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
            {totalConnected} Active Connectors
          </Badge>
          {totalError > 0 && (
            <Badge className="bg-red-500/20 text-red-300 border-red-500/40">
              {totalError} Error States
            </Badge>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle className="text-xs uppercase tracking-widest text-white/50">Supported Providers</DarkCardTitle>
          </DarkCardHeader>
          <DarkCardContent>
            <div className="text-2xl font-bold">6 Providers</div>
            <div className="text-xs text-white/50 mt-1">Razorpay, Swiggy, Zomato, DotPe, Logistics, Tally</div>
          </DarkCardContent>
        </DarkCard>

        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle className="text-xs uppercase tracking-widest text-white/50">Webhook Idempotency</DarkCardTitle>
          </DarkCardHeader>
          <DarkCardContent>
            <div className="text-2xl font-bold text-emerald-400">100% Enforced</div>
            <div className="text-xs text-white/50 mt-1">Unique eventId constraint on WebhookEvent</div>
          </DarkCardContent>
        </DarkCard>

        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle className="text-xs uppercase tracking-widest text-white/50">Secret Verification</DarkCardTitle>
          </DarkCardHeader>
          <DarkCardContent>
            <div className="text-2xl font-bold text-[#3D954F]">HMAC-SHA256</div>
            <div className="text-xs text-white/50 mt-1">Server-side payload signature verification</div>
          </DarkCardContent>
        </DarkCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle>Tenant Integration Statuses</DarkCardTitle>
          </DarkCardHeader>
          <DarkCardContent>
            {configs.length === 0 ? (
              <div className="text-sm text-white/50 py-4">No tenant integrations configured yet. Tenants can configure connectors in /app/integrations.</div>
            ) : (
              <div className="space-y-3">
                {configs.map((c) => (
                  <div key={c.id} className="p-3 bg-white/5 rounded-xl border border-white/10 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white capitalize">{c.provider}</div>
                      <div className="text-white/50">{c.tenant.name}</div>
                    </div>
                    <Badge variant={c.status === "CONNECTED" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </DarkCardContent>
        </DarkCard>

        <DarkCard>
          <DarkCardHeader>
            <DarkCardTitle>Recent Webhook Audits</DarkCardTitle>
          </DarkCardHeader>
          <DarkCardContent>
            {webhookEvents.length === 0 ? (
              <div className="text-sm text-white/50 py-4">No webhook events logged yet. Payment and aggregator webhooks log here.</div>
            ) : (
              <div className="space-y-2">
                {webhookEvents.map((evt) => (
                  <div key={evt.id} className="p-2.5 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white">{evt.provider}</span>
                      <span className="text-white/40 ml-2 font-mono text-[10px]">{evt.eventId}</span>
                    </div>
                    <span className="text-emerald-400 text-[11px]">Processed ✓</span>
                  </div>
                ))}
              </div>
            )}
          </DarkCardContent>
        </DarkCard>
      </div>
    </div>
  );
}
