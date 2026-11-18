import { prisma } from "@/lib/db";
import { AggregatorProvider } from "../core/integration-types";

export class AggregatorReconciliationService {
  /**
   * Get financial summary and orders for reconciliation
   */
  public static async getReconciliation(params: {
    tenantId: string;
    provider?: AggregatorProvider;
    startDate?: Date;
    endDate?: Date;
    outletId?: string;
  }) {
    const { tenantId, provider, startDate, endDate, outletId } = params;

    const whereClause: Record<string, unknown> = {
      tenantId,
      ...(provider ? { provider } : {}),
      ...(outletId ? { outletId } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const orders = await prisma.aggregatorOrderReference.findMany({
      where: whereClause,
      include: {
        outlet: { select: { name: true } },
        order: { select: { orderNumber: true, createdAt: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const summary = orders.reduce(
      (acc, o) => {
        acc.totalOrders += 1;
        acc.grossSalesPaise += o.grossAmountPaise;
        acc.totalDiscountsPaise += o.discountPaise;
        acc.totalTaxesPaise += o.taxesPaise;
        acc.totalCommissionPaise += o.commissionPaise;
        acc.netPayoutPaise += o.netPayoutPaise;
        return acc;
      },
      {
        totalOrders: 0,
        grossSalesPaise: 0,
        totalDiscountsPaise: 0,
        totalTaxesPaise: 0,
        totalCommissionPaise: 0,
        netPayoutPaise: 0,
      }
    );

    return {
      summary: {
        totalOrders: summary.totalOrders,
        grossSales: summary.grossSalesPaise / 100,
        totalDiscounts: summary.totalDiscountsPaise / 100,
        totalTaxes: summary.totalTaxesPaise / 100,
        totalCommission: summary.totalCommissionPaise / 100,
        netPayout: summary.netPayoutPaise / 100,
      },
      orders: orders.map((o) => ({
        id: o.id,
        provider: o.provider,
        providerOrderId: o.providerOrderId,
        orderNumber: o.order.orderNumber,
        outletName: o.outlet.name,
        orderStatus: o.orderStatus,
        itemCount: o.itemCount,
        grossAmount: o.grossAmountPaise / 100,
        discount: o.discountPaise / 100,
        taxes: o.taxesPaise / 100,
        commission: o.commissionPaise / 100,
        netPayout: o.netPayoutPaise / 100,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Export reconciliation records as CSV
   */
  public static async exportCsv(params: {
    tenantId: string;
    provider?: AggregatorProvider;
    startDate?: Date;
    endDate?: Date;
  }): Promise<string> {
    const data = await this.getReconciliation(params);

    const headers = [
      "Provider",
      "Provider Order ID",
      "POS Order Number",
      "Outlet",
      "Status",
      "Items Count",
      "Gross Sales (INR)",
      "Discounts (INR)",
      "Taxes (INR)",
      "Commission (INR)",
      "Net Payout (INR)",
      "Date",
    ];

    const rows = data.orders.map((o) => [
      o.provider,
      o.providerOrderId,
      o.orderNumber,
      `"${o.outletName.replace(/"/g, '""')}"`,
      o.orderStatus,
      o.itemCount,
      o.grossAmount.toFixed(2),
      o.discount.toFixed(2),
      o.taxes.toFixed(2),
      o.commission.toFixed(2),
      o.netPayout.toFixed(2),
      o.createdAt,
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
}
