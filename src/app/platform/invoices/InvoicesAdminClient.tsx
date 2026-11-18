"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import { FileText, Search, Printer, Download, X, Building2, CheckCircle2 } from "lucide-react";

export default function InvoicesAdminClient({ initialInvoices }: { initialInvoices: any[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const filtered = invoices.filter((inv) => {
    return (
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.providerPaymentId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#172B25]">SaaS Subscription Tax Invoices</h1>
          <p className="text-sm text-[#718078]">
            Statutory B2B tax invoices with unique numbering, SAC code 998313, and 18% GST itemization.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718078]" />
          <input
            type="text"
            placeholder="Search by Invoice Number (RNX-INV-...), Restaurant, or Gateway ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] text-xs font-medium text-[#172B25] placeholder:text-[#718078] focus:outline-hidden focus:border-[#16845B] focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-[#718078] font-semibold px-2">
          Showing {filtered.length} of {invoices.length} invoices
        </div>
      </div>

      {/* Invoice Table */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Invoice No.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Billed To</th>
                <th className="px-4 py-3">Plan &amp; Cycle</th>
                <th className="px-4 py-3 text-right">Taxable Subtotal</th>
                <th className="px-4 py-3 text-right">GST (18%)</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#718078]">
                    No invoices match the search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F8FAF9]/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-[#16845B]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-[#718078]">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#172B25]">
                      {inv.businessName}
                    </td>
                    <td className="px-4 py-3 text-[#718078]">
                      {inv.planName} ({inv.billingCycle})
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#718078]">
                      {formatINR(inv.subtotalPaise)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#718078]">
                      {formatINR(inv.totalTaxPaise)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-[#172B25]">
                      {formatINR(inv.totalPaise)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold rounded-xl border-[#E5EBE7] text-[#172B25] hover:bg-[#E8F5EE] hover:text-[#16845B]"
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5EBE7] shadow-xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#16845B]" />
                <h2 className="text-lg font-black text-[#172B25]">RestroNex Tax Invoice</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-bold"
                  onClick={() => window.print()}
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  Print
                </Button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="rounded-full p-1.5 text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Bill Meta */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#718078] block">Supplier (RestroNex SaaS):</span>
                <strong className="text-[#172B25] block text-sm">RestroNex Technologies Pvt Ltd</strong>
                <span className="text-[#718078]">GSTIN: 33AAACR1234F1Z5</span><br />
                <span className="text-[#718078]">SAC Code: 998313 (IT Software)</span>
              </div>
              <div className="text-right">
                <span className="text-[#718078] block">Invoice Number:</span>
                <strong className="text-[#16845B] font-mono text-sm block">{selectedInvoice.invoiceNumber}</strong>
                <span className="text-[#718078]">Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString("en-IN")}</span><br />
                <span className="text-[#718078]">Payment Ref: {selectedInvoice.providerPaymentId}</span>
              </div>
            </div>

            {/* Customer Meta */}
            <div className="bg-[#F8FAF9] p-4 rounded-2xl border border-[#E5EBE7] text-xs space-y-1">
              <span className="text-[#718078] block font-semibold uppercase tracking-wider text-[10px]">Billed To:</span>
              <strong className="text-sm font-bold text-[#172B25] block">{selectedInvoice.businessName}</strong>
              <div className="text-[#718078]">Email: {selectedInvoice.businessEmail} • Phone: {selectedInvoice.businessPhone}</div>
              <div className="text-[#718078]">Billing Period: {new Date(selectedInvoice.periodStart).toLocaleDateString("en-IN")} – {new Date(selectedInvoice.periodEnd).toLocaleDateString("en-IN")}</div>
            </div>

            {/* Line Items Table */}
            <div className="border border-[#E5EBE7] rounded-xl overflow-hidden text-xs">
              <table className="w-full">
                <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[#718078] font-bold">
                  <tr>
                    <th className="text-left p-3">Service Description</th>
                    <th className="text-center p-3">SAC</th>
                    <th className="text-right p-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EBE7]">
                  <tr>
                    <td className="p-3">
                      <strong>RestroNex {selectedInvoice.planName} Plan</strong>
                      <span className="block text-[#718078] text-[11px]">Recurring Restaurant OS Platform License ({selectedInvoice.billingCycle})</span>
                    </td>
                    <td className="p-3 text-center font-mono">998313</td>
                    <td className="p-3 text-right font-medium">{formatINR(selectedInvoice.subtotalPaise)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right font-semibold text-[#718078]">Central GST (CGST @ 9%):</td>
                    <td className="p-2.5 text-right font-medium">{formatINR(selectedInvoice.cgstPaise)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right font-semibold text-[#718078]">State GST (SGST @ 9%):</td>
                    <td className="p-2.5 text-right font-medium">{formatINR(selectedInvoice.sgstPaise)}</td>
                  </tr>
                  <tr className="bg-[#E8F5EE]/40 font-black text-sm">
                    <td colSpan={2} className="p-3 text-right text-[#172B25]">Total Amount Paid (INR):</td>
                    <td className="p-3 text-right text-[#16845B]">{formatINR(selectedInvoice.totalPaise)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer status */}
            <div className="flex items-center justify-between text-xs text-[#718078] pt-2">
              <span className="flex items-center gap-1.5 text-[#16845B] font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Payment Verified via Razorpay Gateway</span>
              </span>
              <span>Computer generated receipt • No physical signature required</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
