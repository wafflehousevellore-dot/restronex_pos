export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import PaymentsAdminClient from "./PaymentsAdminClient";

export default async function PlatformPaymentsPage() {
  const [payments, aggregate, completedAgg, refundsAgg] = await Promise.all([
    prisma.subscriptionPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        subscription: {
          include: {
            tenant: { select: { id: true, name: true, email: true, slug: true } },
            plan: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    prisma.subscriptionPayment.aggregate({
      _count: true,
      _sum: { amountPaise: true },
    }),
    prisma.subscriptionPayment.aggregate({
      where: { status: "COMPLETED" },
      _count: true,
      _sum: { amountPaise: true },
    }),
    prisma.paymentRefund.aggregate({
      where: { status: "PROCESSED" },
      _sum: { amountPaise: true },
    }),
  ]);

  return (
    <PaymentsAdminClient
      initialPayments={payments}
      summary={{
        totalCount: aggregate._count || 0,
        totalPaise: aggregate._sum.amountPaise || 0,
        completedCount: completedAgg._count || 0,
        completedPaise: completedAgg._sum.amountPaise || 0,
        refundPaise: refundsAgg._sum.amountPaise || 0,
      }}
    />
  );
}
