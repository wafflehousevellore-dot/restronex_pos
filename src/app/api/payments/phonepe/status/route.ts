import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkPhonePeStatus } from "@/lib/phonepe";
import { appCache } from "@/lib/cache";
import { generateAndPersistInvoicePdf } from "@/lib/invoice-storage";
import { queueAndSendWhatsAppInvoice } from "@/lib/whatsapp-invoice";
import { queueAndDispatchBillPrintJob } from "@/lib/thermal-printer";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const orderId = searchParams.get("orderId");
  const txnId = searchParams.get("txnId");

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { table: true, payments: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // If already paid
  if (order.isPaid) {
    return NextResponse.json({
      ok: true,
      isPaid: true,
      status: "BILLED",
      orderNumber: order.orderNumber,
      totalPaise: order.totalPaise,
      message: "Order is already paid and confirmed.",
    });
  }

  // Find merchant transaction ID
  let merchantTxnId = txnId;
  if (!merchantTxnId) {
    const attempt = await prisma.paymentAttempt.findFirst({
      where: { orderId: order.id, gatewayType: "PHONEPE" },
      orderBy: { createdAt: "desc" },
    });
    merchantTxnId = attempt?.razorpayOrderId || null;
  }

  if (!merchantTxnId) {
    return NextResponse.json({
      ok: false,
      isPaid: false,
      message: "No active PhonePe transaction found for this order.",
    });
  }

  // Query PhonePe Gateway Status
  try {
    const statusResult = await checkPhonePeStatus({
      tenantId: order.tenantId,
      merchantTransactionId: merchantTxnId,
    });

    if (statusResult.isPaid) {
      const now = new Date();

      // Atomically settle order
      const settled = await prisma.$transaction(async (tx) => {
        // 1. Mark Order Paid
        const updated = await tx.order.update({
          where: { id: order.id },
          data: {
            isPaid: true,
            status: "BILLED",
            paidAt: now,
            billClosedAt: now,
          },
        });

        // 2. Create Payment record
        await tx.payment.create({
          data: {
            orderId: order.id,
            tenantId: order.tenantId,
            outletId: order.outletId,
            method: "PHONEPE_UPI",
            amountPaise: statusResult.amountPaise || order.totalPaise,
            status: "COMPLETED",
            isGatewayConfirmed: true,
            reference: statusResult.transactionId || merchantTxnId,
            upiVpa: statusResult.utr || null,
          },
        });

        // 3. Update Table state
        if (order.tableId) {
          await tx.table.update({
            where: { id: order.tableId },
            data: {
              orderTotalPaise: 0,
            },
          });
        }

        // 4. Update attempt
        await tx.paymentAttempt.updateMany({
          where: { orderId: order.id, gatewayType: "PHONEPE" },
          data: {
            status: "CAPTURED",
            verifiedAt: now,
          },
        });

        return updated;
      });

      // Bust cache
      if (order.table?.qrToken) {
        appCache.del(`qr_table_${order.table.qrToken}`);
      }
      appCache.delPrefix(`report_${order.tenantId}`);

      // Dispatch non-blocking workflows
      const origin = req.nextUrl.origin;
      generateAndPersistInvoicePdf(settled.id, origin).catch((e) =>
        console.error("[PhonePe Status] PDF error:", e)
      );
      if (settled.customerPhone) {
        queueAndSendWhatsAppInvoice(settled.id, { baseUrl: origin }).catch((e) =>
          console.error("[PhonePe Status] WhatsApp invoice dispatch error:", e)
        );
      }
      queueAndDispatchBillPrintJob(settled.id, { baseUrl: origin }).catch((e) =>
        console.error("[PhonePe Status] Thermal print dispatch error:", e)
      );

      return NextResponse.json({
        ok: true,
        isPaid: true,
        status: "BILLED",
        orderNumber: settled.orderNumber,
        totalPaise: settled.totalPaise,
        transactionId: statusResult.transactionId,
        utr: statusResult.utr,
        message: "Payment successfully verified and order confirmed!",
      });
    }

    return NextResponse.json({
      ok: true,
      isPaid: false,
      isPending: statusResult.isPending,
      code: statusResult.code,
      message: statusResult.message || "Payment is pending or not completed.",
    });
  } catch (err: any) {
    console.error("[PhonePe Status Check Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify PhonePe status" },
      { status: 500 }
    );
  }
}
