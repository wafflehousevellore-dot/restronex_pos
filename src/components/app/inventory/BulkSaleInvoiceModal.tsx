"use client";

import React, { useRef } from "react";
import {
  X,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Phone,
  User,
} from "lucide-react";
import { formatINR } from "@/lib/money";

interface BulkSaleInvoiceModalProps {
  sale: any;
  isOpen: boolean;
  onClose: () => void;
}

export function BulkSaleInvoiceModal({ sale, isOpen, onClose }: BulkSaleInvoiceModalProps) {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const tenantName = sale.tenant?.name || "RestroNex Merchant";
  const outletAddress = sale.outlet?.address || sale.tenant?.address || "Restaurant Main Branch";
  const outletCity = sale.outlet?.city || "";
  const outletPhone = sale.outlet?.phone || sale.tenant?.phone || "";
  const gstin = sale.tenant?.gstin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 print:hidden">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Bulk Sales Invoice
            </span>
            <span className="text-xs font-mono font-bold text-gray-700">{sale.invoiceNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#16845B] hover:bg-[#126b4a] text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div ref={printAreaRef} className="p-6 sm:p-8 flex-1 overflow-y-auto space-y-6 text-[#172B25] print:p-0">
          {/* Business Header */}
          <div className="flex items-start justify-between border-b border-gray-200 pb-5">
            <div>
              <h1 className="text-xl font-black text-[#172B25] tracking-tight">{tenantName}</h1>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed max-w-sm">
                {outletAddress} {outletCity && `• ${outletCity}`}
              </p>
              {outletPhone && (
                <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-gray-400" /> {outletPhone}
                </p>
              )}
              {gstin && (
                <p className="text-xs font-mono font-bold text-gray-700 mt-1">
                  GSTIN: {gstin}
                </p>
              )}
            </div>

            <div className="text-right">
              <div className="text-xl font-black text-[#16845B]">TAX INVOICE</div>
              <div className="text-xs font-mono font-bold text-gray-800 mt-1">
                #{sale.invoiceNumber}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-end gap-1">
                <Calendar className="w-3 h-3 text-gray-400" />
                {new Date(sale.saleDate || sale.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Customer & Payment Meta */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50/70 border border-gray-100 text-xs">
            <div>
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-gray-400 block mb-1">
                Billed To Customer
              </span>
              <div className="font-bold text-[#172B25] flex items-center gap-1">
                <User className="w-3 h-3 text-gray-400" />
                {sale.customerName || "Walk-in Customer"}
              </div>
              {sale.customerPhone && (
                <div className="text-gray-600 font-mono mt-0.5">
                  Phone: {sale.customerPhone}
                </div>
              )}
              {sale.customerGstin && (
                <div className="text-gray-700 font-mono font-semibold mt-0.5">
                  GSTIN: {sale.customerGstin}
                </div>
              )}
              {sale.customerAddress && (
                <div className="text-gray-500 mt-0.5">{sale.customerAddress}</div>
              )}
            </div>

            <div className="text-right">
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-gray-400 block mb-1">
                Payment Information
              </span>
              <div className="font-bold text-gray-800 flex items-center justify-end gap-1">
                <CreditCard className="w-3 h-3 text-gray-400" />
                {sale.paymentMethod || "CASH"}
              </div>
              <div className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    sale.status === "CONFIRMED"
                      ? "bg-emerald-100 text-emerald-800"
                      : sale.status === "DRAFT"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {sale.status} • {sale.paymentStatus || "PAID"}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2">Item Description</th>
                  <th className="py-2 text-right">Quantity</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Discount</th>
                  <th className="py-2 text-right">Tax</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sale.items?.map((item: any) => (
                  <tr key={item.id} className="text-gray-800">
                    <td className="py-3 pr-2">
                      <div className="font-bold text-[#172B25]">{item.productName}</div>
                      {item.sku && (
                        <div className="text-[10px] font-mono text-gray-400">SKU: {item.sku}</div>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono font-bold">
                      {item.quantity} {item.sellingUnit}
                    </td>
                    <td className="py-3 text-right font-mono">{formatINR(item.unitPricePaise)}</td>
                    <td className="py-3 text-right font-mono text-gray-500">
                      {item.discountPaise ? formatINR(item.discountPaise) : "-"}
                    </td>
                    <td className="py-3 text-right font-mono text-gray-500">
                      {item.taxPaise ? formatINR(item.taxPaise) : "-"}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#172B25]">
                      {formatINR(item.totalPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="border-t border-gray-200 pt-4 flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono font-bold">{formatINR(sale.subtotalPaise)}</span>
              </div>
              {sale.discountPaise > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Total Discount:</span>
                  <span className="font-mono font-bold">-{formatINR(sale.discountPaise)}</span>
                </div>
              )}
              {sale.taxPaise > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Taxes (CGST + SGST):</span>
                  <span className="font-mono font-bold">{formatINR(sale.taxPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#172B25] pt-2 border-t border-gray-200">
                <span>Grand Total:</span>
                <span className="font-mono text-[#16845B] text-base">{formatINR(sale.totalPaise)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Signatory */}
          <div className="pt-6 border-t border-gray-100 flex items-end justify-between text-[11px] text-gray-500">
            <div>
              <p className="font-bold text-gray-700 mb-0.5">Terms &amp; Conditions:</p>
              <p className="text-gray-500">
                {sale.terms || "Goods once sold in bulk are subject to verification upon delivery. Non-refundable after acceptance."}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="h-10 border-b border-gray-300 w-32 ml-auto" />
              <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
