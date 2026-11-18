"use client";

import React from "react";
import {
  Receipt,
  Download,
  Building2,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnterpriseReportingPayload } from "@/lib/enterprise-reporting";

interface GstTaxReportsTabProps {
  data: EnterpriseReportingPayload;
}

export function GstTaxReportsTab({ data }: GstTaxReportsTabProps) {
  const gt = data.gstTaxAnalytics;
  const ex = data.executiveSummary;

  const handleDownloadTaxReport = () => {
    const url = `/api/reports/export?type=gst_tax${
      data.filters.outletId ? `&outletId=${data.filters.outletId}` : ""
    }&rangePreset=${data.filters.rangePreset || "LAST_30_DAYS"}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* 1. Headline GST Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#718078] uppercase">Taxable Sales Revenue</div>
          <div className="text-2xl font-black text-[#172B25] mt-1">
            ₹{Math.round(gt.taxableSalesPaise / 100).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#718078] mt-0.5">Base net sales before GST</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-900 uppercase">CGST Collected (2.5%)</div>
          <div className="text-2xl font-black text-emerald-950 mt-1">
            ₹{Math.round(gt.cgstPaise / 100).toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-700 mt-0.5">Central Goods & Services Tax</p>
        </div>

        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 shadow-xs">
          <div className="text-[11px] font-bold text-teal-900 uppercase">SGST Collected (2.5%)</div>
          <div className="text-2xl font-black text-teal-950 mt-1">
            ₹{Math.round(gt.sgstPaise / 100).toLocaleString()}
          </div>
          <p className="text-[11px] text-teal-700 mt-0.5">State Goods & Services Tax</p>
        </div>

        <div className="rounded-2xl border border-[#16845B]/30 bg-[#E8F5EE] p-4 shadow-xs">
          <div className="text-[11px] font-bold text-[#16845B] uppercase">Total Tax Liability</div>
          <div className="text-2xl font-black text-[#172B25] mt-1">
            ₹{Math.round(gt.totalTaxPaise / 100).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#16845B] mt-0.5">Total collected for period</p>
        </div>
      </div>

      {/* 2. Outlet-wise GST Tax Matrix Table */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-white shadow-xs overflow-hidden">
        <div className="border-b border-[#E5EBE7] px-6 py-4 bg-[#F8FAF9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-[#172B25] flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#16845B]" />
              Branch & Outlet-Wise GST Tax Collection Ledger
            </h3>
            <p className="text-xs text-[#718078]">
              GSTR-1 compliant tax snapshots recorded at time of bill generation
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleDownloadTaxReport}
            className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Download GSTR-1 CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAF9] border-b border-[#E5EBE7] text-[10px] font-bold uppercase text-[#718078]">
              <tr>
                <th className="py-2.5 px-4">Outlet Name</th>
                <th className="py-2.5 px-3 text-right">Taxable Net Sales</th>
                <th className="py-2.5 px-3 text-right">CGST 2.5%</th>
                <th className="py-2.5 px-3 text-right">SGST 2.5%</th>
                <th className="py-2.5 px-3 text-right">Total Tax Collected</th>
                <th className="py-2.5 px-4 text-center">Effective Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBE7] text-[#172B25]">
              {gt.outletTaxSummary.map((t) => (
                <tr key={t.outletName} className="hover:bg-[#F8FAF9] transition">
                  <td className="py-3 px-4 font-bold">{t.outletName}</td>
                  <td className="py-3 px-3 text-right font-black">
                    ₹{Math.round(t.taxablePaise / 100).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-emerald-800">
                    ₹{Math.round(t.cgstPaise / 100).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-teal-800">
                    ₹{Math.round(t.sgstPaise / 100).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-[#16845B]">
                    ₹{Math.round(t.taxPaise / 100).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-[11px] text-[#718078]">
                    5.0% GST
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Statutory Compliance & Audit Note */}
      <div className="rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] p-4 text-xs text-[#718078] space-y-2">
        <div className="font-extrabold text-[#172B25] flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-[#16845B]" /> Indian GST Restaurant Tax Compliance Notes
        </div>
        <p className="leading-relaxed">
          • All figures are aggregated from <b>immutable invoice-level tax snapshots</b> created at POS billing. Changes to current restaurant tax settings never alter historical invoices.
        </p>
        <p className="leading-relaxed">
          • Standard restaurant rate is <b>5% GST (2.5% CGST + 2.5% SGST)</b> without Input Tax Credit (ITC). Download the GSTR-1 spreadsheet above for monthly accountant filing.
        </p>
      </div>
    </div>
  );
}
