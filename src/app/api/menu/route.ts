import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if(!tenantId) return NextResponse.json({error:"No tenant"},{status:400});
  const mem=await prisma.membership.findFirst({ where:{ userId, tenantId }});
  if(!mem) return NextResponse.json({error:"Forbidden"},{status:403});
  const categories = await prisma.menuCategory.findMany({ where:{ tenantId }, include:{ items:true }, orderBy:{ sortOrder:"asc"}});
  const items = await prisma.menuItem.findMany({ where:{ tenantId }, include:{ variants:true, modifiers:true, category:true }});
  return NextResponse.json({ categories, items });
}

export async function POST(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if(!tenantId) return NextResponse.json({error:"tenantId required"},{status:400});
  const mem=await prisma.membership.findFirst({ where:{ userId, tenantId }});
  if(!mem) return NextResponse.json({error:"Forbidden"},{status:403});
  if(body.type==="category"){
    const cat=await prisma.menuCategory.create({ data:{ tenantId, name: body.name, slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+Math.random().toString(36).slice(2,4), sortOrder: body.sortOrder||0 }});
    return NextResponse.json(cat);
  }
  if(body.type==="item"){
    const item=await prisma.menuItem.create({ data:{ tenantId, categoryId: body.categoryId, name: body.name, pricePaise: body.pricePaise, isVeg: body.isVeg ?? true, description: body.description }});
    return NextResponse.json(item);
  }
  return NextResponse.json({error:"Invalid type"},{status:400});
}
