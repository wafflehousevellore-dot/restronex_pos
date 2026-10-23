import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const memChk=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!memChk) return NextResponse.json({error:"Forbidden"},{status:403});
  const list=await prisma.dayEndSummary.findMany({ where:{ tenantId }, include:{ outlet:true }, orderBy:{ date:"desc" }, take:20 });
  return NextResponse.json(list);
}
export async function POST(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if(!tenantId || !body.outletId) return NextResponse.json({error:"outlet required"},{status:400});
  const memChk2=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!memChk2) return NextResponse.json({error:"Forbidden"},{status:403});
  const outlet=await prisma.outlet.findFirst({where:{ id: body.outletId, tenantId }}); if(!outlet) return NextResponse.json({error:"Invalid outlet"},{status:403});
  const date=body.date || new Date().toISOString().slice(0,10);
  const salesAgg=await prisma.order.aggregate({ where:{ tenantId, outletId: body.outletId, createdAt:{ gte: new Date(date+"T00:00:00.000Z"), lte: new Date(date+"T23:59:59.999Z") }}, _sum:{ totalPaise:true, } });
  const ordersCount=await prisma.order.count({ where:{ tenantId, outletId: body.outletId, createdAt:{ gte: new Date(date+"T00:00:00.000Z"), lte: new Date(date+"T23:59:59.999Z") }}});
  const expenseAgg=await prisma.expense.aggregate({ where:{ tenantId, outletId: body.outletId, createdAt:{ gte: new Date(date+"T00:00:00.000Z"), lte: new Date(date+"T23:59:59.999Z") }}, _sum:{ amountPaise:true }});
  const d=await prisma.dayEndSummary.upsert({ where:{ outletId_date:{ outletId: body.outletId, date }}, create:{ tenantId, outletId: body.outletId, date, salesPaise: salesAgg._sum.totalPaise||0, expensePaise: expenseAgg._sum.amountPaise||0, orders: ordersCount }, update:{ salesPaise: salesAgg._sum.totalPaise||0, expensePaise: expenseAgg._sum.amountPaise||0, orders: ordersCount }});
  await prisma.auditLog.create({ data:{ tenantId, userId, action:"DAY_END_CLOSED", entity:"DayEndSummary", entityId:d.id, metadataJson: JSON.stringify({ date, sales: d.salesPaise })}});
  return NextResponse.json(d);
}
