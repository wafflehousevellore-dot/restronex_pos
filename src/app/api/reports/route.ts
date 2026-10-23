import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, getActiveOrgId, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const memCheck=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!memCheck) return NextResponse.json({error:"Forbidden"},{status:403});
  const orders=await prisma.order.findMany({ where:{ tenantId }, include:{ items:true }});
  const totalSales = orders.reduce((s,o)=> s+o.totalPaise,0);
  const netSales = orders.filter(o=> o.status!=="CANCELLED").reduce((s,o)=> s+o.totalPaise,0);
  const orderCount=orders.length;
  const avgOrder = orderCount? Math.round(totalSales/orderCount):0;
  const byDay: Record<string,number>={};
  for(const o of orders){
    const d=new Date(o.createdAt).toISOString().slice(0,10);
    byDay[d]=(byDay[d]||0)+o.totalPaise;
  }
  const topItems: Record<string,{qty:number, revenue:number}>={};
  for(const o of orders) for(const it of o.items){ const k=it.name; if(!topItems[k]) topItems[k]={qty:0,revenue:0}; topItems[k].qty+=it.quantity; topItems[k].revenue+=it.totalPaise; }
  const topSorted=Object.entries(topItems).sort((a,b)=> b[1].revenue-a[1].revenue).slice(0,5);
  const customers=await prisma.customer.count({ where:{ tenantId }});
  const inventory=await prisma.inventoryItem.findMany({ where:{ tenantId }});
  const lowStock=inventory.filter(i=> i.currentStock <= i.lowStockThreshold).length;

  return NextResponse.json({
    kpis:{ totalSalesPaise: totalSales, netSalesPaise: netSales, orderCount, avgOrderPaise: avgOrder, customers, lowStock },
    salesByDay: Object.entries(byDay).map(([date, paise])=>({date, paise})),
    topItems: topSorted.map(([name,v])=>({name,...v})),
    definitions:{ grossSales:"Sum of all orders totalPaise", netSales:"Gross excluding CANCELLED", avgOrderValue:"totalSales / orderCount" }
  });
}
