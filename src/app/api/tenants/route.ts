import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export async function GET(){
  const { userId } = await getSession();
  if(!userId) return NextResponse.json({error:"Unauthenticated"},{status:401});
  const memberships = await prisma.membership.findMany({ where:{ userId }, include:{ tenant:true, outlet:true }});
  return NextResponse.json(memberships);
}

export async function POST(req: NextRequest){
  const { userId, user } = await getSession();
  if(!userId || !user) return NextResponse.json({error:"Unauthenticated"},{status:401});
  const body = await req.json();
  if(!body.name || !body.businessType) return NextResponse.json({error:"Missing fields"},{status:400});
  const slug = slugify(body.name) + "-" + Math.random().toString(36).slice(2,6);
  const tenant = await prisma.tenant.create({ data:{
    name: body.name, slug, businessType: body.businessType, email: body.email || user.email, phone: body.phone || "+91 90000 00000",
    address: body.address || null, city: body.city || null, state: body.state || null, pincode: body.pincode || null,
    country: body.country||"IN", timeZone: body.timeZone||"Asia/Kolkata", currency: body.currency||"INR",
  }});
  await prisma.membership.create({ data:{ userId, tenantId: tenant.id, role:"OWNER"}});
  await prisma.restaurantSetting.create({ data:{ tenantId: tenant.id, receiptHeader: tenant.name, gstNumber: body.gstNumber }});
  // default tax
  await prisma.taxConfig.createMany({ data:[
    { tenantId: tenant.id, name:"CGST", rateBps: 900 },
    { tenantId: tenant.id, name:"SGST", rateBps: 900 },
  ]});
  // seed categories/items for demo
  const cat1 = await prisma.menuCategory.create({ data:{ tenantId: tenant.id, name:"Pizza", slug:"pizza-"+slug, sortOrder:1 }});
  const cat2 = await prisma.menuCategory.create({ data:{ tenantId: tenant.id, name:"Beverages", slug:"beverages-"+slug, sortOrder:2 }});
  await prisma.menuItem.createMany({ data:[
    { tenantId: tenant.id, categoryId: cat1.id, name:"Margherita Pizza", pricePaise:29900, isVeg:true, description:"Classic cheese & tomato" },
    { tenantId: tenant.id, categoryId: cat1.id, name:"Farmhouse Pizza", pricePaise:39900, isVeg:true, description:"Onion, capsicum, tomato" },
    { tenantId: tenant.id, categoryId: cat1.id, name:"Pepper Chicken Pizza", pricePaise:44900, isVeg:false, description:"Spicy pepper chicken" },
    { tenantId: tenant.id, categoryId: cat2.id, name:"Cold Coffee", pricePaise:14900, isVeg:true },
    { tenantId: tenant.id, categoryId: cat2.id, name:"Masala Lemonade", pricePaise:9900, isVeg:true },
  ]});
  // seed outlet
  const outlet = await prisma.outlet.create({ data:{ tenantId: tenant.id, name: body.outletName || `${body.name} — Main Outlet`, slug:"main-"+slug.slice(0,8), address: body.address||"Koramangala, Bengaluru", city: body.city||"Bengaluru", phone: body.phone||"+91 90000 00000"}});
  // seed tables
  for(let i=1;i<=12;i++) await prisma.table.create({ data:{ tenantId: tenant.id, outletId: outlet.id, number:`T${String(i).padStart(2,"0")}`, area: i<=6?"Main Hall": i<=10?"Terrace":"AC", capacity: [2,4,4,6][i%4] }});
  await prisma.auditLog.create({ data:{ tenantId: tenant.id, userId, action:"TENANT_CREATED", entity:"Tenant", entityId: tenant.id, metadataJson: JSON.stringify({ name: tenant.name }) }});
  return NextResponse.json({ ok:true, tenantId: tenant.id, slug: tenant.slug });
}
