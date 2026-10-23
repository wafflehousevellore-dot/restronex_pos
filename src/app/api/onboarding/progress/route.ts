import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest){
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({error:"Unauthenticated"},{status:401});
  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ tenantId:null, onboardingStep:0, onboardingComplete:false });
  const tenant = await prisma.tenant.findUnique({ where:{ id: tenantId }});
  if (!tenant) return NextResponse.json({ tenantId:null, onboardingStep:0, onboardingComplete:false });
  return NextResponse.json({ tenantId: tenant.id, onboardingStep: tenant.onboardingStep, onboardingComplete: tenant.onboardingComplete, name: tenant.name });
}

export async function POST(req: NextRequest){
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({error:"Unauthenticated"},{status:401});
  let body: any; try{ body=await req.json(); }catch{ return NextResponse.json({error:"Invalid JSON"},{status:400}); }
  const { tenantId: explicit, step, complete } = body as { tenantId?:string; step?:number; complete?:boolean };
  const tenantId = explicit || await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({error:"No organization"},{status:400});
  const mem = await prisma.membership.findFirst({ where:{ tenantId, userId }});
  if (!mem) return NextResponse.json({error:"Forbidden"},{status:403});
  const data:any = {};
  if (typeof step === "number") data.onboardingStep = Math.max(0, Math.min(7, step));
  if (typeof complete === "boolean") data.onboardingComplete = complete;
  const updated = await prisma.tenant.update({ where:{ id: tenantId }, data });
  await prisma.auditLog.create({ data:{ tenantId, userId, action:"ONBOARDING_PROGRESS", entity:"Tenant", entityId: tenantId, metadataJson: JSON.stringify({ step: updated.onboardingStep, complete: updated.onboardingComplete }) }});
  return NextResponse.json({ ok:true, onboardingStep: updated.onboardingStep, onboardingComplete: updated.onboardingComplete });
}
