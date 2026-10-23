import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, getActiveOrgId, resolveTenantId } from "@/lib/auth";
export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  const outletId = req.nextUrl.searchParams.get("outletId");
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const checkMem=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!checkMem) return NextResponse.json({error:"Forbidden"},{status:403});
  const where:any={ tenantId };
  if(outletId) where.outletId=outletId;
  const tables=await prisma.table.findMany({ where, orderBy:{ number:"asc"}});
  return NextResponse.json(tables);
}
export async function PATCH(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const t=await prisma.table.update({ where:{ id: body.tableId }, data:{ status: body.status }});
  return NextResponse.json(t);
}
