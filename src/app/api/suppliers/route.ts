import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const memChk=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!memChk) return NextResponse.json({error:"Forbidden"},{status:403});
  const list=await prisma.supplier.findMany({ where:{ tenantId }, orderBy:{ name:"asc" }});
  return NextResponse.json(list);
}
export async function POST(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const memChk2=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!memChk2) return NextResponse.json({error:"Forbidden"},{status:403});
  const s=await prisma.supplier.create({ data:{ tenantId, name: body.name, phone: body.phone||null, email: body.email||null }});
  return NextResponse.json(s);
}
