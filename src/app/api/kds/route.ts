import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const memChk=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!memChk) return NextResponse.json({error:"Forbidden"},{status:403});
  const tickets=await prisma.kitchenTicket.findMany({ where:{ tenantId }, include:{ order:{ include:{ items:true } } }, orderBy:{ createdAt:"desc"}, take:50 });
  return NextResponse.json(tickets);
}
export async function PATCH(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const t=await prisma.kitchenTicket.update({ where:{ id: body.ticketId }, data:{ status: body.status }});
  return NextResponse.json(t);
}
