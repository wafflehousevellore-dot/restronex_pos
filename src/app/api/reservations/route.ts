import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, getActiveOrgId, resolveTenantId } from "@/lib/auth";
export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const mem=await prisma.membership.findFirst({where:{ userId, tenantId }}); if(!mem) return NextResponse.json({error:"Forbidden"},{status:403});
  const list=await prisma.reservation.findMany({ where:{ tenantId }, include:{ outlet:true }, orderBy:{ date:"desc" }, take:50 });
  return NextResponse.json(list);
}
export async function POST(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if(!tenantId || !body.outletId) return NextResponse.json({error:"outlet required"},{status:400});
  const outlet=await prisma.outlet.findFirst({where:{ id: body.outletId, tenantId }}); if(!outlet) return NextResponse.json({error:"Invalid outlet"},{status:403});
  const r=await prisma.reservation.create({ data:{ tenantId, outletId: body.outletId, name: body.name||"Guest", phone: body.phone||"", partySize: parseInt(String(body.partySize||2))||2, date: new Date(body.date), status:"BOOKED" }});
  await prisma.auditLog.create({ data:{ tenantId, userId, action:"RESERVATION_CREATED", entity:"Reservation", entityId:r.id, metadataJson: JSON.stringify({ outletId: body.outletId })}});
  return NextResponse.json(r);
}
export async function PATCH(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const r=await prisma.reservation.update({ where:{ id: body.reservationId }, data:{ status: body.status }});
  return NextResponse.json(r);
}
