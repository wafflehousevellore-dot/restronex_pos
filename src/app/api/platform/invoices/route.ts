import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePlatformPermissionApi } from "@/lib/platform-auth";
import { calculateGstBreakdownPaise, generateSaaSInvoiceNumber } from "@/lib/subscription-plans-config";

export async function GET(req: NextRequest) {
  const guard = await requirePlatformPermissionApi("platform.payments.view");
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId");

  const payments = await prisma.subscriptionPayment.findMany({
    where: {
      status: "COMPLETED",
      ...(tenantId ? { tenantId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      subscription: {
        include: {
          tenant: true,
          plan: true,
        },
      },
    },
  });

  // Enrich each subscription payment into a certified SaaS invoice record
  const invoices = payments.map((p, index) => {
    const subtotal = Math.round((p.amountPaise * 100) / 118); // Derived from inclusive total
    const tax = calculateGstBreakdownPaise(subtotal);
    const invoiceNumber = p.invoiceNumber || generateSaaSInvoiceNumber(index + 1, p.createdAt);

    return {
      id: p.id,
      invoiceNumber,
      paymentId: p.id,
      providerPaymentId: p.providerPaymentId || p.razorpayPaymentId || "DIRECT_AUTH",
      businessName: p.subscription.tenant.name,
      businessEmail: p.subscription.tenant.email,
      businessPhone: p.subscription.tenant.phone,
      tenantId: p.subscription.tenant.id,
      planName: p.subscription.plan.name,
      planSlug: p.subscription.plan.slug,
      billingCycle: p.subscription.billingCycle,
      subtotalPaise: tax.subtotalPaise,
      cgstPaise: tax.cgstPaise,
      sgstPaise: tax.sgstPaise,
      totalTaxPaise: tax.totalTaxPaise,
      totalPaise: p.amountPaise,
      status: p.status,
      invoiceDate: p.createdAt,
      periodStart: p.subscription.currentPeriodStart,
      periodEnd: p.subscription.currentPeriodEnd,
    };
  });

  return NextResponse.json({ invoices });
}
