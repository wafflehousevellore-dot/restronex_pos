import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyInvoicePublicToken } from "@/lib/messaging/invoice-token-service";
import { formatINR } from "@/lib/money";
import {
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  FileText,
  MapPin,
  Phone,
} from "lucide-react";
import PrintButton from "./PrintButton";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const res = await verifyInvoicePublicToken(token);
  if (!res.ok || !res.invoice) {
    return {
      title: "Invoice Not Found | RestroNex",
      description: "Digital tax invoice could not be located.",
    };
  }

  return {
    title: `Tax Invoice ${res.invoice.invoiceNumber} — ${res.invoice.restaurantName}`,
    description: `Official digital receipt for order ${res.invoice.orderNumber} at ${res.invoice.outletName}`,
  };
}

export default async function PublicDigitalInvoicePage({ params }: PageProps) {
  const { token } = await params;
  const res = await verifyInvoicePublicToken(token);

  if (!res.ok || !res.invoice) {
    const isExpired = res.error === "EXPIRED";
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-4 font-sans text-[#172B25]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E5EBE7] shadow-lg text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-black text-[#172B25]">
            {isExpired ? "Invoice Link Expired" : "Invoice Not Found"}
          </h1>
          <p className="text-sm text-[#718078] leading-relaxed">
            {isExpired
              ? "This digital invoice link has reached its retention expiry limit. Please contact the restaurant counter for a freshly regenerated copy or reprint."
              : "We could not find a valid tax invoice associated with this link. It may have been revoked or the URL might be incomplete."}
          </p>
          <div className="pt-2 text-xs text-[#718078]">
            RestroNex Secure Customer Billing Platform
          </div>
        </div>
      </div>
    );
  }

  const inv = res.invoice;
  const dateFormatted = new Date(inv.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const isPaid = inv.paymentStatus === "PAID";
  const isPartiallyPaid = inv.paymentStatus === "PARTIALLY_PAID";

  return (
    <div className="min-h-screen bg-[#F8FAF9] py-8 px-4 font-sans text-[#172B25] antialiased">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Top Floating Actions */}
        <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-[#E5EBE7] shadow-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#16845B]" />
            <span className="text-xs font-black uppercase tracking-wider text-[#16845B]">
              Verified Tax Invoice
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={inv.pdfDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#16845B] bg-[#E8F5EE] hover:bg-[#D4EBDD] rounded-xl transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>PDF</span>
            </a>
            <PrintButton />
          </div>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-3xl border border-[#E5EBE7] shadow-xl overflow-hidden print:border-none print:shadow-none">
          {/* Header Banner */}
          <div className="bg-[#172B25] text-white p-6 sm:p-8 text-center relative">
            <div className="text-xs uppercase tracking-widest text-[#16845B] font-bold mb-1">
              Official GST Tax Invoice
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{inv.restaurantName}</h1>
            <p className="text-sm text-gray-300 mt-1">{inv.outletName}</p>

            {(inv.outletAddress || inv.outletCity) && (
              <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                {[inv.outletAddress, inv.outletCity].filter(Boolean).join(", ")}
              </p>
            )}

            <div className="flex flex-wrap justify-center gap-4 mt-3 text-[11px] text-gray-400 font-mono">
              {inv.gstin && <span>GSTIN: {inv.gstin}</span>}
              {inv.fssai && <span>FSSAI: {inv.fssai}</span>}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-[#E5EBE7] text-xs">
              <div>
                <span className="text-[#718078] block">Invoice Number</span>
                <span className="font-mono font-bold text-sm text-[#172B25]">{inv.invoiceNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-[#718078] block">Order Number</span>
                <span className="font-mono font-bold text-sm text-[#172B25]">{inv.orderNumber}</span>
              </div>
              <div>
                <span className="text-[#718078] block">Date &amp; Time</span>
                <span className="font-medium text-[#172B25]">{dateFormatted}</span>
              </div>
              <div className="text-right">
                <span className="text-[#718078] block">Service Type</span>
                <span className="font-bold text-[#172B25]">
                  {inv.orderType.replace("_", " ")} {inv.tableName ? `(Table ${inv.tableName})` : ""}
                </span>
              </div>
              {inv.customerName && (
                <div className="col-span-2 pt-2 border-t border-dashed border-[#E5EBE7]">
                  <span className="text-[#718078] block">Billed To</span>
                  <span className="font-bold text-[#172B25]">
                    {inv.customerName} {inv.customerPhone ? `(${inv.customerPhone})` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-[#718078] mb-3">
                Order Items
              </h2>
              <div className="space-y-3">
                {inv.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs">
                    <div className="space-y-0.5 max-w-[70%]">
                      <div className="font-bold text-[#172B25]">
                        <span className="inline-block w-6 font-mono text-[#16845B]">
                          {it.quantity}x
                        </span>
                        {it.name}
                      </div>
                      {it.modifiers && it.modifiers.length > 0 && (
                        <div className="pl-6 text-[11px] text-[#718078] space-y-0.5">
                          {it.modifiers.map((m, mIdx) => (
                            <div key={mIdx}>
                              + {m.name}{" "}
                              {m.pricePaise ? `(${formatINR(m.pricePaise)})` : ""}
                            </div>
                          ))}
                        </div>
                      )}
                      {it.notes && (
                        <div className="pl-6 text-[10px] italic text-[#718078]">Note: {it.notes}</div>
                      )}
                    </div>
                    <div className="font-mono font-bold text-right text-[#172B25]">
                      {formatINR(it.totalPaise)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="pt-4 border-t border-[#E5EBE7] space-y-2 text-xs">
              <div className="flex justify-between text-[#718078]">
                <span>Item Subtotal</span>
                <span className="font-mono">{formatINR(inv.subtotalPaise)}</span>
              </div>
              {inv.discountPaise > 0 && (
                <div className="flex justify-between text-[#16845B] font-medium">
                  <span>Special Discount</span>
                  <span className="font-mono">-{formatINR(inv.discountPaise)}</span>
                </div>
              )}
              {inv.cgstPaise > 0 && (
                <div className="flex justify-between text-[#718078]">
                  <span>CGST (2.5%)</span>
                  <span className="font-mono">{formatINR(inv.cgstPaise)}</span>
                </div>
              )}
              {inv.sgstPaise > 0 && (
                <div className="flex justify-between text-[#718078]">
                  <span>SGST (2.5%)</span>
                  <span className="font-mono">{formatINR(inv.sgstPaise)}</span>
                </div>
              )}

              <div className="pt-3 border-t-2 border-[#172B25] flex justify-between items-baseline font-black">
                <span className="text-base text-[#172B25]">Grand Total</span>
                <span className="text-2xl text-[#16845B] font-mono">{formatINR(inv.totalPaise)}</span>
              </div>
            </div>

            {/* Payment Aware Status Card */}
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 ${
                isPaid
                  ? "bg-[#E8F5EE] border-[#B2DECA] text-[#116B49]"
                  : isPartiallyPaid
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-red-50 border-red-200 text-red-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-sm">
                  {isPaid ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>STATUS: {inv.paymentStatus}</span>
                </div>
                <div className="font-mono font-bold text-xs uppercase">
                  PAYMENT: {inv.paymentSummary}
                </div>
              </div>

              {inv.paidPaise > 0 && inv.balanceDuePaise > 0 && (
                <div className="flex justify-between pt-1 border-t border-amber-200/60 font-semibold">
                  <span>PAID: {formatINR(inv.paidPaise)}</span>
                  <span>BALANCE DUE: {formatINR(inv.balanceDuePaise)}</span>
                </div>
              )}

              {inv.paymentStatus === "UNPAID" && (
                <div className="flex justify-between pt-1 border-t border-red-200/60 font-semibold">
                  <span>BALANCE DUE:</span>
                  <span className="font-mono font-bold">{formatINR(inv.balanceDuePaise)}</span>
                </div>
              )}

              {inv.payments.length > 0 && (
                <div className="pt-2 border-t border-black/10 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                    Recorded Payment Transactions
                  </span>
                  {inv.payments.map((p, pIdx) => (
                    <div key={pIdx} className="flex justify-between text-[11px] font-mono">
                      <span>
                        {p.method} {p.reference ? `(${p.reference})` : ""}
                      </span>
                      <span>{formatINR(p.amountPaise)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-4 border-t border-[#E5EBE7] space-y-1 text-xs text-[#718078]">
              <p className="font-medium">Thank you for dining with us!</p>
              <p className="text-[10px]">RestroNex Restaurant OS • Powered by Waffle Plum House</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
