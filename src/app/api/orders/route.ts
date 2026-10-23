import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { orderCreateSchema } from "@/lib/validators";
import { calcOrderTotals } from "@/lib/money";

export async function GET(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if(!tenantId) return NextResponse.json({error:"tenant"},{status:400});
  const mem=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!mem) return NextResponse.json({error:"Forbidden"},{status:403});
  const outletId = req.nextUrl.searchParams.get("outletId");
  const where:any={ tenantId };
  if(outletId) where.outletId=outletId;
  const orders=await prisma.order.findMany({ where, include:{ items:true, payments:true }, orderBy:{ createdAt:"desc"}, take:50 });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest){
  const {userId}=await getSession(); if(!userId) return NextResponse.json({error:"Unauth"},{status:401});
  const body=await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if(!tenantId) return NextResponse.json({error:"tenant required"},{status:400});
  const mem=await prisma.membership.findFirst({where:{userId, tenantId}}); if(!mem) return NextResponse.json({error:"Forbidden"},{status:403});
  const parsed=orderCreateSchema.safeParse(body);
  if(!parsed.success) return NextResponse.json({error:parsed.error.issues[0].message},{status:400});
  const d=parsed.data;
  // verify outlet belongs to tenant
  const outlet=await prisma.outlet.findFirst({where:{ id:d.outletId, tenantId }});
  if(!outlet) return NextResponse.json({error:"Invalid outlet"},{status:400});

  const lineTotals = d.items.map(it=> {
    const mods = (it as any).modifiers?.reduce((s:number,m:any)=>s+m.pricePaise,0) || 0;
    return (it.unitPricePaise + mods) * it.quantity;
  });
  const totals=calcOrderTotals({ lineTotalsPaise: lineTotals, discountPaise: d.discountPaise||0, taxRateBps: 1800, serviceChargeBps: 0 });
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;

  // transaction
  const order=await prisma.$transaction(async(tx)=>{
    const o=await tx.order.create({ data:{
      tenantId, outletId:d.outletId, orderNumber, type:d.type, status:"BILLED", tableId: d.tableId||undefined,
      customerName: d.customerName, customerPhone: d.customerPhone, notes: d.notes,
      subtotalPaise: totals.subtotal, taxPaise: totals.tax, discountPaise: totals.afterDiscount !== totals.subtotal ? d.discountPaise : 0,
      serviceChargePaise: totals.service, totalPaise: totals.total, createdById: userId, kotStatus:"SENT",
    }});
    for(const it of d.items){
      const modsPrice = (it as any).modifiers?.reduce((s:number,m:any)=>s+m.pricePaise,0)||0;
      await tx.orderItem.create({ data:{
        orderId:o.id, menuItemId: it.menuItemId, name: it.name, quantity: it.quantity,
        unitPricePaise: it.unitPricePaise, variantName: (it as any).variantName,
        modifiersJson: (it as any).modifiers? JSON.stringify((it as any).modifiers): null,
        notes: (it as any).notes, totalPaise: (it.unitPricePaise+modsPrice)*it.quantity, kotStatus:"SENT"
      }});
    }
    await tx.kitchenTicket.create({ data:{ orderId:o.id, tenantId, outletId:d.outletId, station:"MAIN", status:"RECEIVED" }});
    // payments: if body.paymentMethod provided else cash
    const payMethod = body.paymentMethod || "CASH";
    await tx.payment.create({ data:{ orderId:o.id, method: payMethod, amountPaise: totals.total, status:"COMPLETED" }});
    // stock deduction: for each item with recipe, deduct
    for(const it of d.items){
      const recipe=await tx.recipe.findUnique({ where:{ menuItemId: it.menuItemId }, include:{ ingredients:true }});
      if(recipe){
        for(const ing of recipe.ingredients){
          const inv=await tx.inventoryItem.findUnique({ where:{ id: ing.inventoryItemId }});
          if(inv){
            const newStock = inv.currentStock - (ing.quantity * it.quantity / recipe.yieldQty);
            await tx.inventoryItem.update({ where:{ id: inv.id }, data:{ currentStock: newStock }});
            await tx.stockMovement.create({ data:{ tenantId, outletId:d.outletId, inventoryItemId: inv.id, type:"CONSUMPTION", quantity: -(ing.quantity*it.quantity), reference: o.orderNumber }});
          }
        }
      }
    }
    await tx.auditLog.create({ data:{ tenantId, userId, action:"ORDER_CREATED", entity:"Order", entityId:o.id, metadataJson: JSON.stringify({ orderNumber, total: totals.total }) }});
    if(d.tableId){
      await tx.table.update({ where:{ id: d.tableId }, data:{ status:"BILLING", currentOrderId: o.id }}).catch(()=>{});
    }
    return o;
  });

  return NextResponse.json({ ok:true, orderId: order.id, orderNumber: order.orderNumber, totals });
}
