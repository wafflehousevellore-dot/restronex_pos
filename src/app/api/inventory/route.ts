import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const memCheck=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!memCheck) return NextResponse.json({error:"Forbidden"},{status:403});
  const items=await prisma.inventoryItem.findMany({ where:{ tenantId }, orderBy:{ name:"asc"}});
  const movements=await prisma.stockMovement.findMany({ where:{ tenantId }, orderBy:{ createdAt:"desc"}, take:30 });
  return NextResponse.json({ items, movements });
}
export async function POST(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const item=await prisma.inventoryItem.create({ data:{ tenantId, name: body.name, unit: body.unit||"KG", currentStock: body.currentStock||0, lowStockThreshold: body.lowStockThreshold||5, costPerUnitPaise: body.costPerUnitPaise||0 }});
  if(body.currentStock) await prisma.stockMovement.create({ data:{ tenantId, inventoryItemId: item.id, type:"PURCHASE", quantity: body.currentStock, reference:"Opening stock" }});
  return NextResponse.json(item);
}
