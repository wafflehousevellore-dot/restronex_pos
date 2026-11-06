import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, getActiveOrgId } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";

export async function GET(){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"}, {status:401});
  const orgId = await getActiveOrgId();
  if(orgId){
    const mem=await prisma.membership.findFirst({ where:{ userId, tenantId: orgId }});
    if(!mem) return NextResponse.json({error:"Forbidden"},{status:403});
    const outlets = await prisma.outlet.findMany({ where:{ tenantId: orgId }, orderBy:{ createdAt:"desc"} });
    return NextResponse.json(outlets);
  }
  const memberships = await prisma.membership.findMany({ where:{ userId }});
  const tenantIds = memberships.map(m=>m.tenantId);
  if(tenantIds.length===0) return NextResponse.json([]);
  const outlets = await prisma.outlet.findMany({ where:{ tenantId:{ in: tenantIds } }, orderBy:{ createdAt:"desc"} });
  return NextResponse.json(outlets);
}

export async function POST(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  if(!body.tenantId) return NextResponse.json({error:"tenantId required"},{status:400});
  const mem=await prisma.membership.findFirst({ where:{ userId, tenantId: body.tenantId }});
  if(!mem || !["OWNER","HEAD_OFFICE"].includes(mem.role)) return NextResponse.json({error:"Forbidden"},{status:403});

  // Strict Plan-based outlet limit enforcement:
  const ent = await getEntitlements(body.tenantId);
  const currentCount = await prisma.outlet.count({ where: { tenantId: body.tenantId, status: "ACTIVE" } });

  if (currentCount >= ent.maxOutlets) {
    return NextResponse.json({
      error: `OUTLET_LIMIT_REACHED: Your ${ent.planName || "Starter"} plan permits a maximum of ${ent.maxOutlets} active outlet(s). Upgrade to Growth (up to 5 outlets) or Business (multi-outlet) to add more branches.`,
      code: "OUTLET_LIMIT_EXCEEDED",
      maxOutlets: ent.maxOutlets,
      currentCount,
      upgradeUrl: "/checkout?change=true&plan=growth",
    }, { status: 403 });
  }

  const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+Math.random().toString(36).slice(2,5);
  const outlet=await prisma.outlet.create({ data:{ tenantId: body.tenantId, name: body.name, slug, address: body.address||"", city: body.city||"Bengaluru", phone: body.phone||"" }});
  return NextResponse.json(outlet);
}
