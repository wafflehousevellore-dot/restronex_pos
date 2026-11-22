/**
 * RestroNex Bulk Inventory Sales Service
 * Manages direct B2B and bulk inventory sales, unit conversions, atomic stock deduction,
 * unique invoice generation, and audit-compliant sales registers.
 */

import { prisma } from "@/lib/db";
import { appCache } from "@/lib/cache";
import { recordStockMovement, InsufficientStockError } from "./stock-ledger";
import { convertToBaseUnit } from "./unit-conversion";

export interface BulkSaleItemInput {
  inventoryItemId: string;
  quantity: number;
  sellingUnit: string;
  unitPricePaise: number;
  discountPaise?: number;
  taxRateBps?: number; // e.g. 500 for 5%, 1800 for 18%
}

export interface CreateBulkSaleInput {
  tenantId: string;
  outletId: string;
  customerName?: string;
  customerPhone?: string;
  customerGstin?: string;
  customerAddress?: string;
  items: BulkSaleItemInput[];
  paymentMethod?: "CASH" | "UPI" | "CARD" | "CREDIT" | "BANK_TRANSFER";
  paymentStatus?: "PAID" | "PENDING" | "PARTIAL";
  notes?: string;
  terms?: string;
  isDraft?: boolean;
  userId?: string;
}

export interface BulkSaleFilter {
  tenantId: string;
  outletId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Generate unique, tenant-scoped and outlet-aware invoice number for bulk sales.
 * Format: BS-YYYYMMDD-XXXX (e.g. BS-20261122-8F92)
 */
export function generateBulkSaleInvoiceNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix =
    now.getTime().toString(36).slice(-2).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BS-${dateStr}-${randomSuffix}`;
}

export interface BulkSaleCalculationInput {
  items: Array<{
    inventoryItemId: string;
    quantity: number;
    unitPricePaise: number;
    taxRateBps?: number;
    discountPaise?: number;
  }>;
  overallDiscountPaise?: number;
  deliveryChargePaise?: number;
  packagingChargePaise?: number;
}

export function calculateBulkSaleTotals(input: BulkSaleCalculationInput) {
  let subtotalPaise = 0;
  let lineDiscountsPaise = 0;
  let taxPaise = 0;

  for (const item of input.items) {
    const qty = Math.max(0, item.quantity);
    const price = Math.max(0, item.unitPricePaise);
    const lineSubtotal = Math.round(qty * price);
    const lineDiscount = Math.min(lineSubtotal, Math.max(0, item.discountPaise || 0));
    const taxable = lineSubtotal - lineDiscount;
    const taxBps = Math.max(0, item.taxRateBps || 0);
    const itemTax = Math.round((taxable * taxBps) / 10000);

    subtotalPaise += lineSubtotal;
    lineDiscountsPaise += lineDiscount;
    taxPaise += itemTax;
  }

  const overallDiscount = Math.max(0, input.overallDiscountPaise || 0);
  const totalDiscountPaise = lineDiscountsPaise + overallDiscount;
  const deliveryChargePaise = Math.max(0, input.deliveryChargePaise || 0);
  const packagingChargePaise = Math.max(0, input.packagingChargePaise || 0);

  const netTaxable = Math.max(0, subtotalPaise - totalDiscountPaise);
  const grandTotalPaise = netTaxable + taxPaise + deliveryChargePaise + packagingChargePaise;
  const cgstPaise = Math.round(taxPaise / 2);
  const sgstPaise = taxPaise - cgstPaise;

  return {
    subtotalPaise,
    totalDiscountPaise,
    taxPaise,
    cgstPaise,
    sgstPaise,
    deliveryChargePaise,
    packagingChargePaise,
    grandTotalPaise,
  };
}

export class BulkSalesService {
  /**
   * Create and record a new bulk sale with atomic stock deduction.
   */
  static async createBulkSale(input: CreateBulkSaleInput) {
    const {
      tenantId,
      outletId,
      customerName,
      customerPhone,
      customerGstin,
      customerAddress,
      items,
      paymentMethod = "CASH",
      paymentStatus = "PAID",
      notes,
      terms,
      isDraft = false,
      userId,
    } = input;

    if (!items || items.length === 0) {
      throw new Error("Bulk sale must contain at least one inventory product.");
    }

    // Verify outlet belongs to tenant
    const outlet = await prisma.outlet.findFirst({
      where: { id: outletId, tenantId },
    });
    if (!outlet) {
      throw new Error("Invalid outlet specified for tenant.");
    }

    // Load and validate all inventory items
    const itemIds = items.map((i) => i.inventoryItemId);
    const dbItems = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, tenantId },
    });
    const dbItemMap = new Map(dbItems.map((it) => [it.id, it]));

    if (dbItems.length !== itemIds.length) {
      throw new Error("One or more inventory items were not found or belong to another tenant.");
    }

    // Calculate line totals and verify stock availability
    let subtotalPaise = 0;
    let totalDiscountPaise = 0;
    let totalTaxPaise = 0;

    const preparedLineItems = items.map((line) => {
      const dbItem = dbItemMap.get(line.inventoryItemId)!;
      const unit = line.sellingUnit || dbItem.sellingUnit || dbItem.unit;
      const qty = Math.abs(line.quantity);

      // Convert selling quantity to base inventory unit
      let baseQtyDeducted = qty;
      try {
        baseQtyDeducted = convertToBaseUnit(qty, unit, dbItem);
      } catch {
        baseQtyDeducted = qty;
      }

      // Check stock if not draft
      if (!isDraft && dbItem.currentStock < baseQtyDeducted) {
        throw new InsufficientStockError(
          dbItem.name,
          dbItem.currentStock,
          baseQtyDeducted,
          dbItem.unit,
          dbItem.id
        );
      }

      const unitPrice = Math.max(0, line.unitPricePaise);
      const lineSubtotal = Math.round(qty * unitPrice);
      const discount = Math.min(lineSubtotal, Math.max(0, line.discountPaise || 0));
      const taxable = lineSubtotal - discount;
      const taxRateBps = line.taxRateBps !== undefined ? line.taxRateBps : dbItem.taxRateBps || 0;
      const taxAmount = Math.round((taxable * taxRateBps) / 10000);
      const lineTotal = taxable + taxAmount;

      subtotalPaise += lineSubtotal;
      totalDiscountPaise += discount;
      totalTaxPaise += taxAmount;

      return {
        inventoryItemId: dbItem.id,
        productName: dbItem.name,
        sku: dbItem.sku || null,
        quantity: qty,
        sellingUnit: unit,
        baseQuantityDeducted: baseQtyDeducted,
        unitPricePaise: unitPrice,
        discountPaise: discount,
        taxRateBps,
        taxPaise: taxAmount,
        totalPaise: lineTotal,
      };
    });

    const grandTotalPaise = subtotalPaise - totalDiscountPaise + totalTaxPaise;
    const invoiceNumber = generateBulkSaleInvoiceNumber();
    const status = isDraft ? "DRAFT" : "CONFIRMED";

    // Execute transactional persistence & stock deduction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create BulkSale header
      const bulkSale = await tx.bulkSale.create({
        data: {
          tenantId,
          outletId,
          invoiceNumber,
          customerName: customerName?.trim() || "Walk-in Customer",
          customerPhone: customerPhone?.trim() || null,
          customerGstin: customerGstin?.trim() || null,
          customerAddress: customerAddress?.trim() || null,
          status,
          subtotalPaise,
          discountPaise: totalDiscountPaise,
          taxPaise: totalTaxPaise,
          totalPaise: grandTotalPaise,
          paymentMethod,
          paymentStatus,
          notes: notes?.trim() || null,
          terms: terms?.trim() || null,
          createdById: userId || null,
        },
      });

      // 2. Create BulkSale line items
      for (const line of preparedLineItems) {
        await tx.bulkSaleItem.create({
          data: {
            bulkSaleId: bulkSale.id,
            ...line,
          },
        });

        // 3. If confirmed (not draft), deduct stock atomically via Stock Ledger
        if (!isDraft) {
          await recordStockMovement(tx, {
            tenantId,
            outletId,
            inventoryItemId: line.inventoryItemId,
            type: "BULK_SALE",
            quantity: -line.baseQuantityDeducted,
            reference: `Bulk Sale Invoice #${invoiceNumber}`,
            notes: `Customer: ${bulkSale.customerName}`,
            userId,
          });
        }
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: userId || null,
          action: isDraft ? "BULK_SALE_DRAFT_CREATED" : "BULK_SALE_CONFIRMED",
          entity: "BulkSale",
          entityId: bulkSale.id,
          metadataJson: JSON.stringify({
            invoiceNumber,
            totalPaise: grandTotalPaise,
            customerName: bulkSale.customerName,
            itemCount: preparedLineItems.length,
          }),
        },
      });

      return bulkSale;
    });

    appCache.delPrefix(`report_${tenantId}`);
    return result;
  }

  /**
   * Confirm an existing DRAFT bulk sale and deduct stock.
   */
  static async confirmDraftSale(tenantId: string, bulkSaleId: string, userId?: string) {
    const sale = await prisma.bulkSale.findFirst({
      where: { id: bulkSaleId, tenantId },
      include: { items: true },
    });

    if (!sale) throw new Error("Bulk sale not found.");
    if (sale.status !== "DRAFT") {
      throw new Error(`Cannot confirm sale with status '${sale.status}'.`);
    }

    return await prisma.$transaction(async (tx) => {
      // Deduct stock for all items
      for (const item of sale.items) {
        await recordStockMovement(tx, {
          tenantId,
          outletId: sale.outletId,
          inventoryItemId: item.inventoryItemId,
          type: "BULK_SALE",
          quantity: -item.baseQuantityDeducted,
          reference: `Bulk Sale Invoice #${sale.invoiceNumber}`,
          notes: `Confirmed Draft: ${sale.customerName}`,
          userId,
        });
      }

      const updated = await tx.bulkSale.update({
        where: { id: sale.id },
        data: { status: "CONFIRMED" },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: userId || null,
          action: "BULK_SALE_DRAFT_CONFIRMED",
          entity: "BulkSale",
          entityId: sale.id,
          metadataJson: JSON.stringify({ invoiceNumber: sale.invoiceNumber }),
        },
      });

      return updated;
    });
  }

  /**
   * Cancel or refund a confirmed bulk sale, safely reversing stock deductions.
   */
  static async cancelOrRefundSale(
    tenantId: string,
    bulkSaleId: string,
    action: "CANCELLED" | "REFUNDED",
    reason: string,
    userId?: string
  ) {
    const sale = await prisma.bulkSale.findFirst({
      where: { id: bulkSaleId, tenantId },
      include: { items: true },
    });

    if (!sale) throw new Error("Bulk sale not found.");
    if (sale.status === "CANCELLED" || sale.status === "REFUNDED") {
      throw new Error(`Sale is already marked as ${sale.status}.`);
    }

    const wasConfirmed = sale.status === "CONFIRMED";

    return await prisma.$transaction(async (tx) => {
      // If sale was confirmed, reverse the stock deductions
      if (wasConfirmed) {
        for (const item of sale.items) {
          await recordStockMovement(tx, {
            tenantId,
            outletId: sale.outletId,
            inventoryItemId: item.inventoryItemId,
            type: "BULK_SALE_REFUND",
            quantity: item.baseQuantityDeducted, // Positive to restore stock
            reference: `Reversal for #${sale.invoiceNumber}: ${reason}`,
            userId,
          });
        }
      }

      const updated = await tx.bulkSale.update({
        where: { id: sale.id },
        data: {
          status: action,
          notes: sale.notes ? `${sale.notes}\n[${action}]: ${reason}` : `[${action}]: ${reason}`,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: userId || null,
          action: `BULK_SALE_${action}`,
          entity: "BulkSale",
          entityId: sale.id,
          metadataJson: JSON.stringify({
            invoiceNumber: sale.invoiceNumber,
            reason,
            reversalCount: wasConfirmed ? sale.items.length : 0,
          }),
        },
      });

      return updated;
    });
  }

  /**
   * Query bulk sales history with pagination, filters, and outlet context.
   */
  static async listBulkSales(filter: BulkSaleFilter) {
    const { tenantId, outletId, status, startDate, endDate, search, limit = 50, cursor } = filter;

    const where: any = { tenantId };
    if (outletId && outletId !== "ALL") where.outletId = outletId;
    if (status && status !== "ALL") where.status = status;

    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.saleDate.lte = end;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
      ];
    }

    const sales = await prisma.bulkSale.findMany({
      where,
      take: Math.min(limit, 100),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        outlet: { select: { id: true, name: true, city: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true, sku: true } },
          },
        },
      },
      orderBy: { saleDate: "desc" },
    });

    return sales;
  }

  /**
   * Retrieve single bulk sale by ID or invoice number for rendering invoice.
   */
  static async getBulkSaleDetail(tenantId: string, identifier: string) {
    const sale = await prisma.bulkSale.findFirst({
      where: {
        tenantId,
        OR: [{ id: identifier }, { invoiceNumber: identifier }],
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            pincode: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
          },
        },
        items: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    return sale;
  }
}
