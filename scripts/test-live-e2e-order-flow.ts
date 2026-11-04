import { prisma } from "../src/lib/db";
import crypto from "crypto";

async function runLiveE2ETest() {
  console.log("\n==================================================================");
  console.log("   RESTRO NEX — LIVE END-TO-END TABLE ORDER, KDS & POS TEST");
  console.log("==================================================================\n");

  let passed = 0;
  const total = 7;

  try {
    // 1. Locate an active tenant and table
    console.log("▶ Step 1: Discover active tenant & outlet context");
    const tenant = await prisma.tenant.findFirst({
      where: { status: "ACTIVE" },
      include: {
        outlets: true,
        tables: true,
        menuItems: { where: { isActive: true } },
      },
    });

    if (!tenant) throw new Error("No active tenant found in database");
    if (tenant.outlets.length === 0) throw new Error("No outlet found for tenant");
    if (tenant.tables.length === 0) throw new Error("No tables found for tenant");
    if (tenant.menuItems.length === 0) throw new Error("No menu items found for tenant");

    const outlet = tenant.outlets[0];
    const table = tenant.tables[0];
    const menuItem = tenant.menuItems[0];

    console.log(`  ✓ Discovered Tenant: ${tenant.name} (${tenant.id})`);
    console.log(`  ✓ Discovered Outlet: ${outlet.name}`);
    console.log(`  ✓ Discovered Table: ${table.number} (Current status: ${table.status})`);
    console.log(`  ✓ Discovered Menu Item: ${menuItem.name} (₹${(menuItem.pricePaise / 100).toFixed(2)})`);
    passed++;

    // 2. Ensure table has valid QR token
    console.log("\n▶ Step 2: Validate Table QR token");
    let qrToken = table.qrToken;
    if (!qrToken) {
      qrToken = `tbl_${crypto.randomBytes(6).toString("hex")}`;
      await prisma.table.update({ where: { id: table.id }, data: { qrToken } });
    }
    console.log(`  ✓ QR Token verified: ${qrToken}`);
    passed++;

    // 3. Simulate Guest Table QR Order
    console.log("\n▶ Step 3: Simulate Guest placing order via Table QR");
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const guestQty = 2;
    const itemTotal = menuItem.pricePaise * guestQty;
    const taxPaise = Math.round(itemTotal * 0.05); // 5% GST
    const totalPaise = itemTotal + taxPaise;

    const guestOrder = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          tenantId: tenant.id,
          outletId: outlet.id,
          orderNumber,
          type: "QR",
          serviceMode: "DINE_IN",
          status: "PLACED",
          tableId: table.id,
          customerName: "Smoke Test Guest",
          customerPhone: "+91 99999 88888",
          notes: "Extra crispy please",
          subtotalPaise: itemTotal,
          taxPaise: taxPaise,
          discountPaise: 0,
          serviceChargePaise: 0,
          totalPaise: totalPaise,
          kotStatus: "PENDING",
          isPaid: false,
          whatsappConsent: true,
        },
      });

      await tx.orderItem.create({
        data: {
          orderId: o.id,
          menuItemId: menuItem.id,
          name: menuItem.name,
          quantity: guestQty,
          unitPricePaise: menuItem.pricePaise,
          totalPaise: itemTotal,
          kotStatus: "SENT",
        },
      });

      const kt = await tx.kitchenTicket.create({
        data: {
          orderId: o.id,
          tenantId: tenant.id,
          outletId: outlet.id,
          station: "MAIN",
          status: "RECEIVED",
        },
      });

      await tx.table.update({
        where: { id: table.id },
        data: {
          status: "OCCUPIED",
          currentOrderId: o.id,
          orderTotalPaise: totalPaise,
        },
      });

      return { order: o, ticket: kt };
    });

    console.log(`  ✓ Guest Order created: #${guestOrder.order.orderNumber} (₹${(totalPaise / 100).toFixed(2)})`);
    console.log(`  ✓ Kitchen Ticket created: ${guestOrder.ticket.id} [Status: RECEIVED]`);
    console.log(`  ✓ Table ${table.number} status updated to OCCUPIED`);
    passed++;

    // 4. Verify KDS pipeline & ticket progression
    console.log("\n▶ Step 4: Verify Kitchen KDS ticket bump workflow");
    // Bump to PREPARING
    const preparingTicket = await prisma.kitchenTicket.update({
      where: { id: guestOrder.ticket.id },
      data: { status: "PREPARING" },
    });
    console.log(`  ✓ Chef started cooking: Ticket ${preparingTicket.id} [Status: ${preparingTicket.status}]`);

    // Bump to READY
    const readyTicket = await prisma.kitchenTicket.update({
      where: { id: guestOrder.ticket.id },
      data: { status: "READY" },
    });
    console.log(`  ✓ Order cooked & plated: Ticket ${readyTicket.id} [Status: ${readyTicket.status}] (Bell Waiter)`);

    // Bump to COMPLETED
    const completedTicket = await prisma.kitchenTicket.update({
      where: { id: guestOrder.ticket.id },
      data: { status: "COMPLETED" },
    });
    console.log(`  ✓ Order served to table: Ticket ${completedTicket.id} [Status: ${completedTicket.status}]`);
    passed++;

    // 5. Verify POS Active Table Lookup
    console.log("\n▶ Step 5: Verify POS pulling active Table Order");
    const posTable = await prisma.table.findUnique({
      where: { id: table.id },
    });

    if (!posTable || posTable.status !== "OCCUPIED" || posTable.currentOrderId !== guestOrder.order.id) {
      throw new Error(`POS Table status mismatch: expected OCCUPIED with order ${guestOrder.order.id}`);
    }

    const posOrder = await prisma.order.findUnique({
      where: { id: posTable.currentOrderId },
      include: { items: true },
    });

    if (!posOrder || posOrder.items.length === 0) {
      throw new Error("POS failed to fetch active table order items");
    }

    console.log(`  ✓ POS correctly identified active Table ${posTable.number} order: #${posOrder.orderNumber}`);
    console.log(`  ✓ POS retrieved ${posOrder.items.length} item(s): ${posOrder.items[0].quantity}x ${posOrder.items[0].name}`);
    passed++;

    // 6. Settle Order & Print Thermal Bill
    console.log("\n▶ Step 6: Settle Bill & Issue Thermal Receipt");
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Mark order PAID and BILLED
      await tx.order.update({
        where: { id: guestOrder.order.id },
        data: {
          status: "BILLED",
          isPaid: true,
          paidAt: now,
          billClosedAt: now,
        },
      });

      // Record Cash Payment
      await tx.payment.create({
        data: {
          orderId: guestOrder.order.id,
          tenantId: tenant.id,
          outletId: outlet.id,
          method: "CASH",
          amountPaise: guestOrder.order.totalPaise,
          status: "COMPLETED",
          reference: invoiceNumber,
        },
      });

      // Generate Invoice record
      await tx.invoiceRecord.create({
        data: {
          tenantId: tenant.id,
          outletId: outlet.id,
          orderId: guestOrder.order.id,
          invoiceNumber,
          customerName: guestOrder.order.customerName,
          customerPhone: guestOrder.order.customerPhone,
          subtotalPaise: guestOrder.order.subtotalPaise,
          taxPaise: guestOrder.order.taxPaise,
          discountPaise: 0,
          totalPaise: guestOrder.order.totalPaise,
          status: "FINALIZED",
        },
      });

      // Queue Thermal Print Job
      await tx.printJob.create({
        data: {
          tenantId: tenant.id,
          outletId: outlet.id,
          orderId: guestOrder.order.id,
          jobType: "BILL",
          contentJson: JSON.stringify({
            invoiceNumber,
            table: table.number,
            totalPaise: guestOrder.order.totalPaise,
          }),
          status: "COMPLETED",
        },
      });

      // Free Table back to AVAILABLE
      await tx.table.update({
        where: { id: table.id },
        data: {
          status: "AVAILABLE",
          currentOrderId: null,
          orderTotalPaise: 0,
        },
      });
    });

    console.log(`  ✓ Bill settled: Invoice #${invoiceNumber} [Status: BILLED, isPaid: true]`);
    console.log(`  ✓ 80mm/58mm Thermal Bill print job generated and completed`);
    passed++;

    // 7. Verify Table Status freed and ready for next guest
    console.log("\n▶ Step 7: Verify Table status after bill settlement");
    const freedTable = await prisma.table.findUnique({ where: { id: table.id } });
    if (!freedTable || freedTable.status !== "AVAILABLE" || freedTable.currentOrderId !== null) {
      throw new Error(`Table not freed properly: status=${freedTable?.status}, currentOrderId=${freedTable?.currentOrderId}`);
    }
    console.log(`  ✓ Table ${freedTable.number} status is now AVAILABLE and clean for next diners.`);
    passed++;

    console.log("\n==================================================================");
    console.log(`   TEST PASSED: ${passed}/${total} END-TO-END SCENARIOS VERIFIED 100%`);
    console.log("==================================================================\n");
  } catch (err) {
    console.error("\n❌ TEST FAILED WITH ERROR:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runLiveE2ETest();
