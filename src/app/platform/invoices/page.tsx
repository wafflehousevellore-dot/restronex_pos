export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { calculateGstBreakdownPaise, generateSaaSInvoiceNumber } from "@/lib/subscription-plans-config";
import InvoicesAdminClient from "./InvoicesAdminClient";

export default async function PlatformInvoicesPage() {
  const payments = await prisma.subscriptionPayment.findMany({
    where: { status: "COMPLETED" },
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

  const invoices = payments.map((p, index) => {
    const subtotal = Math.round((p.amountPaise * 100) / 118);
    const tax = calculateGstBreakdownPaise(subtotal);
    const invoiceNumber = p.invoiceNumber || generateSaaSInvoiceNumber(index + 1, p.createdAt);

    return {
      id: p.id,
      invoiceNumber,
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
      invoiceDate: p.createdAt.toISOString(),
      periodStart: p.subscription.currentPeriodStart.toISOString(),
      periodEnd: p.subscription.currentPeriodEnd.toISOString(),
    };
  });

  return <InvoicesAdminClient initialInvoices={invoices} />;
}
