import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main(){
  // Seed or update plans to Starter ₹99, Growth ₹199, Business ₹299
  const plansData = [
    { name:"Starter", slug:"starter", priceMonthlyPaise:9900, priceAnnualPaise:99000, maxOutlets:1, maxUsers:5, featuresJson: JSON.stringify(["1 Outlet","5 Staff","Core POS billing","Menu & category management","Basic order operations","Essential reports","Basic restaurant settings"]), sortOrder:1 },
    { name:"Growth", slug:"growth", priceMonthlyPaise:19900, priceAnnualPaise:199000, maxOutlets:5, maxUsers:25, featuresJson: JSON.stringify(["Up to 5 Outlets","25 Staff","Core POS billing","Menu & category management","Outlet management","Inventory functionality","Advanced reports","Staff & outlet permissions"]), sortOrder:2 },
    { name:"Business", slug:"business", priceMonthlyPaise:29900, priceAnnualPaise:299000, maxOutlets:50, maxUsers:200, featuresJson: JSON.stringify(["Multi-outlet restaurant operations","Centralized management","Consolidated reports","Advanced inventory capabilities","Outlet-specific settings & permissions","Unlimited staff accounts","Priority 24×7 support"]), sortOrder:3 },
  ];
  for (const p of plansData) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: p.slug },
      update: { name: p.name, priceMonthlyPaise: p.priceMonthlyPaise, priceAnnualPaise: p.priceAnnualPaise, maxOutlets: p.maxOutlets, maxUsers: p.maxUsers, featuresJson: p.featuresJson, sortOrder: p.sortOrder },
      create: p,
    });
  }
  // Delete legacy enterprise plan if exists
  await prisma.subscriptionPlan.deleteMany({ where: { slug: "enterprise" } }).catch(() => {});
  console.log("Seeded and synchronized Starter ₹99, Growth ₹199, Business ₹299 plans");

  // demo user
  const demoEmail="owner@demo.in";
  let user = await prisma.user.findUnique({ where:{ email: demoEmail }});
  if(!user){
    const hash = await bcrypt.hash("demo1234",10);
    user = await prisma.user.create({ data:{ email: demoEmail, name:"Demo Owner", role:"OWNER", clerkId: hash.slice(0,20) }});
    await prisma.auditLog.create({ data:{ userId:user.id, action:"USER_SIGNUP", entity:"User", entityId:user.id, metadataJson: JSON.stringify({ email:demoEmail, pwHash: hash }) }});
    console.log("Created demo user owner@demo.in / demo1234");
  }

  // demo tenant if none
  const tenantCount = await prisma.tenant.count();
  if(tenantCount===0){
    const tenant = await prisma.tenant.create({ data:{ name:"Spice Route — Demo", slug:"spice-route-demo-"+Math.random().toString(36).slice(2,5), businessType:"Fine Dining", email:demoEmail, phone:"+91 98765 43210", country:"IN", timeZone:"Asia/Kolkata", currency:"INR" }});
    await prisma.membership.create({ data:{ userId: user.id, tenantId: tenant.id, role:"OWNER"}});
    await prisma.restaurantSetting.create({ data:{ tenantId: tenant.id, receiptHeader:"Spice Route — Demo", gstNumber:"29ABCDE1234F1Z5"}});
    await prisma.taxConfig.createMany({ data:[{ tenantId: tenant.id, name:"CGST", rateBps:900 }, { tenantId: tenant.id, name:"SGST", rateBps:900 }]});
    const cat1 = await prisma.menuCategory.create({ data:{ tenantId: tenant.id, name:"Pizza", slug:"pizza-demo", sortOrder:1 }});
    const cat2 = await prisma.menuCategory.create({ data:{ tenantId: tenant.id, name:"Beverages", slug:"beverages-demo", sortOrder:2 }});
    const cat3 = await prisma.menuCategory.create({ data:{ tenantId: tenant.id, name:"Mains", slug:"mains-demo", sortOrder:3 }});
    await prisma.menuItem.createMany({ data:[
      { tenantId: tenant.id, categoryId: cat1.id, name:"Margherita Pizza", pricePaise:29900, isVeg:true, description:"Classic cheese & tomato" },
      { tenantId: tenant.id, categoryId: cat1.id, name:"Farmhouse Pizza", pricePaise:39900, isVeg:true },
      { tenantId: tenant.id, categoryId: cat1.id, name:"Pepper Chicken Pizza", pricePaise:44900, isVeg:false },
      { tenantId: tenant.id, categoryId: cat2.id, name:"Cold Coffee", pricePaise:14900, isVeg:true },
      { tenantId: tenant.id, categoryId: cat2.id, name:"Masala Lemonade", pricePaise:9900, isVeg:true },
      { tenantId: tenant.id, categoryId: cat3.id, name:"Paneer Tikka", pricePaise:34900, isVeg:true },
      { tenantId: tenant.id, categoryId: cat3.id, name:"Dal Makhani", pricePaise:24900, isVeg:true },
    ]});
    const outlet = await prisma.outlet.create({ data:{ tenantId: tenant.id, name:"Koramangala — Main Outlet", slug:"main-demo", address:"8th Block, Koramangala, Bengaluru", city:"Bengaluru", phone:"+91 98765 43210"}});
    for(let i=1;i<=12;i++) await prisma.table.create({ data:{ tenantId: tenant.id, outletId: outlet.id, number:`T${String(i).padStart(2,"0")}`, area: i<=6?"Main Hall": i<=10?"Terrace":"AC", capacity:[2,4,4,6][i%4] }});
    const plan = await prisma.subscriptionPlan.findFirst({ where:{ slug:"growth"}});
    if(plan) await prisma.subscription.create({ data:{ tenantId: tenant.id, planId: plan.id, status:"TRIALING", currentPeriodEnd: new Date(Date.now()+14*24*60*60*1000), trialEndsAt: new Date(Date.now()+14*24*60*60*1000), billingCycle:"MONTHLY" }});
    await prisma.inventoryItem.createMany({ data:[
      { tenantId: tenant.id, name:"Tomato", unit:"KG", currentStock: 40, lowStockThreshold:5, costPerUnitPaise:3000 },
      { tenantId: tenant.id, name:"Mozzarella", unit:"KG", currentStock: 12, lowStockThreshold:3, costPerUnitPaise:45000 },
      { tenantId: tenant.id, name:"Paneer", unit:"KG", currentStock: 8, lowStockThreshold:2, costPerUnitPaise:35000 },
    ]});
    console.log("Seeded demo tenant, outlet, menu, tables, inventory, subscription");
  }
  console.log("Seed done");
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(async()=>{ await prisma.$disconnect(); });
