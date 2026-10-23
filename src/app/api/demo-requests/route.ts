import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { demoRequestSchema } from "@/lib/validators";

export async function POST(req: NextRequest){
  try{
    const body = await req.json();
    const parsed = demoRequestSchema.safeParse(body);
    if(!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const rec = await prisma.demoRequest.create({ data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      restaurantName: parsed.data.restaurantName,
      city: parsed.data.city,
      message: parsed.data.message,
    }});
    await prisma.auditLog.create({ data: { action: "DEMO_REQUEST_CREATED", entity: "DemoRequest", entityId: rec.id, metadataJson: JSON.stringify({ email: rec.email }) }});
    return NextResponse.json({ ok: true, id: rec.id });
  }catch(e:any){
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(){
  const list = await prisma.demoRequest.findMany({ orderBy:{ createdAt:"desc"}, take: 20 });
  return NextResponse.json(list);
}
