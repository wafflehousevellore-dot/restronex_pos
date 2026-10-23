import { NextRequest, NextResponse } from "next/server";
import { getSession, setActiveOrgId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest){
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({error:"Unauthenticated"},{status:401});
  let body: any; try{ body=await req.json(); }catch{ return NextResponse.json({error:"Invalid JSON"},{status:400}); }
  const { tenantId } = body as { tenantId:string };
  if (!tenantId) return NextResponse.json({error:"tenantId required"},{status:400});
  const mem = await prisma.membership.findFirst({ where:{ userId, tenantId }});
  if (!mem) return NextResponse.json({error:"Not a member of this organization"},{status:403});
  await setActiveOrgId(tenantId);
  return NextResponse.json({ ok:true, tenantId });
}
