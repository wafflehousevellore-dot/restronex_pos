import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const mem=await prisma.membership.findFirst({where:{ userId, tenantId }}); if(!mem) return NextResponse.json({error:"Forbidden"},{status:403});
  const list=await prisma.feedback.findMany({ where:{ tenantId }, orderBy:{ createdAt:"desc" }, take:50 });
  return NextResponse.json(list);
}
export async function POST(req: NextRequest){
  const body=await req.json();
  // public QR — if unauth, allow via token but need tenantId/outletId
  const tenantId = body.tenantId;
  if(!tenantId) return NextResponse.json({error:"tenant required"},{status:400});
  const f=await prisma.feedback.create({ data:{ tenantId, outletId: body.outletId||null, orderId: body.orderId||null, rating: parseInt(String(body.rating||5)), comment: body.comment||null }});
  return NextResponse.json(f);
}
