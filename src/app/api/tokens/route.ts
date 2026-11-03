import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  const outletId = req.nextUrl.searchParams.get("outletId");
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const memChk=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!memChk) return NextResponse.json({error:"Forbidden"},{status:403});
  const where:any={ tenantId };
  if(outletId) where.outletId=outletId;
  const tokens=await prisma.token.findMany({ where, orderBy:{ createdAt:"asc" }, take:50 });
  return NextResponse.json(tokens);
}
export async function POST(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if(!tenantId || !body.outletId) return NextResponse.json({error:"tenant/outlet required"},{status:400});
  const outlet=await prisma.outlet.findFirst({where:{ id: body.outletId, tenantId }});
  if(!outlet) return NextResponse.json({error:"Invalid outlet"},{status:403});
  const count=await prisma.token.count({ where:{ outletId: body.outletId, tenantId }});
  const t=await prisma.token.create({ data:{ tenantId, outletId: body.outletId, tokenNo: count+1, queuePos: count+1, status:"WAITING" }});
  await prisma.auditLog.create({ data:{ tenantId, userId, action:"TOKEN_ISSUED", entity:"Token", entityId:t.id, metadataJson: JSON.stringify({ outletId: body.outletId, tokenNo: t.tokenNo })}});
  return NextResponse.json(t);
}
export async function PATCH(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const t=await prisma.token.update({ where:{ id: body.tokenId }, data:{ status: body.status }});
  return NextResponse.json(t);
}
