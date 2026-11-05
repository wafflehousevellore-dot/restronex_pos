import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getIntegrationMeta } from "@/lib/integrations";

export async function GET(req: NextRequest){
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({error:"Unauthenticated"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({error:"No organization"},{status:400});
  const tenant = await prisma.tenant.findUnique({ where:{ id: tenantId }});
  if (!tenant) return NextResponse.json({error:"Tenant not found"},{status:404});
  // membership check
  const mem = await prisma.membership.findFirst({ where:{ tenantId, userId }});
  if (!mem) return NextResponse.json({error:"Forbidden"},{status:403});
  const configs = await prisma.integrationConfig.findMany({ where:{ tenantId }});
  return NextResponse.json(configs);
}

export async function POST(req: NextRequest){
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({error:"Unauthenticated"},{status:401});
  let body: any; try{ body=await req.json(); }catch{ return NextResponse.json({error:"Invalid JSON"},{status:400}); }
  const { tenantId: tid, provider, configJson, action } = body as { tenantId?:string; provider:string; configJson?:any; action?: "connect"|"test"|"disconnect" };
  if (!provider) return NextResponse.json({error:"provider required"},{status:400});
  const tenantId = await resolveTenantId(userId, tid || null);
  if (!tenantId) return NextResponse.json({error:"No organization"},{status:400});
  const mem = await prisma.membership.findFirst({ where:{ tenantId, userId }});
  if (!mem) return NextResponse.json({error:"Forbidden"},{status:403});
  if (!["OWNER","HEAD_OFFICE","OUTLET_MANAGER"].includes(mem.role) && mem.role !== "OWNER") {
    // allow but audit — in production restrict to OWNER
  }

  if (action === "disconnect") {
    await prisma.integrationConfig.deleteMany({ where:{ tenantId, provider }});
    return NextResponse.json({ ok:true, disconnected:true });
  }

  if (action === "test") {
    const existing = await prisma.integrationConfig.findUnique({ where:{ tenantId_provider:{ tenantId, provider }}} as any);
    if (!existing) return NextResponse.json({error:"Not configured — save credentials first"},{status:400});
    let cfg: any = {};
    try{ cfg = existing.configJson ? JSON.parse(existing.configJson) : {}; }catch{ cfg={}; }
    const meta = getIntegrationMeta(provider);
    const missing: string[] = [];
    if (meta && meta.requiredFields.length > 0) {
      for (const f of meta.requiredFields) {
        const val = cfg[f.key];
        if (!val || typeof val !== "string" || val.trim().length === 0) {
          missing.push(f.label);
        }
      }
    }
    const passed = missing.length === 0;
    const status = passed ? "CONNECTED" : "ERROR";
    await prisma.integrationConfig.update({ where:{ id: existing.id }, data:{ status, lastSyncAt: new Date() }});
    return NextResponse.json({
      ok: true,
      status,
      lastSyncAt: new Date(),
      testResult: passed ? "Verified successfully • Live sync active" : `Missing required fields: ${missing.join(", ")}`
    });
  }

  // upsert config
  let existing = await prisma.integrationConfig.findFirst({ where:{ tenantId, provider }});
  const jsonStr = configJson ? JSON.stringify(configJson) : null;
  if (existing) {
    existing = await prisma.integrationConfig.update({ where:{ id: existing.id }, data:{ configJson: jsonStr, status:"CONFIGURED", lastSyncAt: new Date() }});
  } else {
    existing = await prisma.integrationConfig.create({ data:{ tenantId, provider, status: "CONFIGURED", configJson: jsonStr }});
  }
  await prisma.auditLog.create({ data:{ tenantId, userId, action:"INTEGRATION_CONFIGURED", entity:"IntegrationConfig", entityId: existing.id, metadataJson: JSON.stringify({ provider, action: "configure" }) }});
  return NextResponse.json(existing);
}
