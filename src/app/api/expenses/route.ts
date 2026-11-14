import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { appCache } from "@/lib/cache";
export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const mem=await prisma.membership.findFirst({where:{ userId, tenantId }}); if(!mem) return NextResponse.json({error:"Forbidden"},{status:403});
  const list=await prisma.expense.findMany({ where:{ tenantId }, include:{ outlet:true }, orderBy:{ createdAt:"desc" }, take:50 });
  return NextResponse.json(list);
}
export async function POST(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if(!tenantId || !body.outletId) return NextResponse.json({error:"outlet required"},{status:400});
  const outlet=await prisma.outlet.findFirst({where:{ id: body.outletId, tenantId }}); if(!outlet) return NextResponse.json({error:"Invalid outlet"},{status:403});
  const e=await prisma.expense.create({ data:{ tenantId, outletId: body.outletId, category: body.category||"Other", amountPaise: body.amountPaise||0, note: body.note||null }});
  await prisma.auditLog.create({ data:{ tenantId, userId, action:"EXPENSE_CREATED", entity:"Expense", entityId:e.id }});
  appCache.delPrefix(`report_${tenantId}`);
  return NextResponse.json(e);
}
