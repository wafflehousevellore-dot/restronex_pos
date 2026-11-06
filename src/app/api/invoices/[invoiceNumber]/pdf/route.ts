import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateInvoicePDF, InvoicePDFData } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const { invoiceNumber } = await params;
    if (!invoiceNumber) {
      return NextResponse.json({ error: "Invoice number required" }, { status: 400 });
    }

    const invoice = await prisma.invoiceRecord.findFirst({
      where: { invoiceNumber },
      include: {
        tenant: { include: { settings: true } },
        order: {
          include: {
            items: true,
            outlet: true,
            table: true,
            payments: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!invoice || !invoice.order) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const order = invoice.order;
    const tenant = invoice.tenant;
    const outlet = order.outlet;
    const setting = tenant.settings;
    const payment = order.payments?.[0];

    const orderDate = new Date(order.createdAt);
    const dateFormatted = orderDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeFormatted = orderDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const isPaid = order.isPaid || payment?.status === "COMPLETED";

    const pdfData: InvoicePDFData = {
      restaurantName: setting?.receiptHeader || tenant.name || "RestroNex Restaurant",
      outletName: outlet.name,
      outletAddress: outlet.address,
      outletCity: outlet.city,
      outletPhone: outlet.phone,
      gstin: setting?.gstNumber || null,
      fssai: setting?.fssaiNumber || null,
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: order.orderNumber,
      date: dateFormatted,
      time: timeFormatted,
      orderType: order.type,
      tableName: order.table?.number || null,
      staffName: "Counter Staff",
      customerName: invoice.customerName || order.customerName || "Valued Guest",
      customerPhone: invoice.customerPhone || order.customerPhone || null,
      items: order.items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unitPricePaise: it.unitPricePaise,
        totalPaise: it.totalPaise,
      })),
      subtotalPaise: invoice.subtotalPaise,
      discountPaise: invoice.discountPaise,
      cgstPaise: Math.round(invoice.taxPaise / 2),
      sgstPaise: Math.round(invoice.taxPaise / 2),
      otherTaxesPaise: 0,
      totalPaise: invoice.totalPaise,
      paymentMethod: payment?.method || (order.isPaid ? "UPI" : "UNPAID"),
      paymentStatus: isPaid ? "PAID" : "UNPAID",
      transactionId: payment?.reference || order.orderNumber,
    };

    const pdfBuffer = await generateInvoicePDF(pdfData);

    const filename = `Invoice-${invoiceNumber}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err: any) {
    console.error("Failed to generate invoice PDF:", err);
    return NextResponse.json({ error: "Failed to generate invoice PDF" }, { status: 500 });
  }
}
