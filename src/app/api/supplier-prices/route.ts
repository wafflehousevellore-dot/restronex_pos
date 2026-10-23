import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, getActiveOrgId, resolveTenantId } from "@/lib/auth";
export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const memChk=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!memChk) return NextResponse.json({error:"Forbidden"},{status:403});
  const itemId=req.nextUrl.searchParams.get("itemId");
  const where:any={ tenantId }; if(itemId) where.inventoryItemId=itemId;
  const list=await prisma.supplierPrice.findMany({ where, include:{ supplier:true, inventoryItem:true }, orderBy:{ pricePaise:"asc" }});
  return NextResponse.json(list);
}
export async function POST(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const memChk2=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!memChk2) return NextResponse.json({error:"Forbidden"},{status:403});
  const sp=await prisma.supplierPrice.upsert({ where:{ inventoryItemId_supplierId:{ inventoryItemId: body.inventoryItemId, supplierId: body.supplierId }}, create:{ tenantId, inventoryItemId: body.inventoryItemId, supplierId: body.supplierId, pricePaise: body.pricePaise }, update:{ pricePaise: body.pricePaise }});
  return NextResponse.json(sp);
}
