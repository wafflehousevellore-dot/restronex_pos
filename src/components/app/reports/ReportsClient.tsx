"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { ReportsHeaderBar } from "./ReportsHeaderBar";
import { ReportsNavigationTabs, ReportsTabKey } from "./ReportsNavigationTabs";
import { OverviewTab } from "./OverviewTab";
import { SalesAnalyticsTab } from "./SalesAnalyticsTab";
import { ProductAnalyticsTab } from "./ProductAnalyticsTab";
import { InventoryAnalyticsTab } from "./InventoryAnalyticsTab";
import { FinancialAccountingTab } from "./FinancialAccountingTab";
import { GstTaxReportsTab } from "./GstTaxReportsTab";
import { OutletPerformanceTab } from "./OutletPerformanceTab";
import { StaffAnalyticsTab } from "./StaffAnalyticsTab";
import { CustomerAnalyticsTab } from "./CustomerAnalyticsTab";
import { AuditLogsTab } from "./AuditLogsTab";
import { ExportCenterTab } from "./ExportCenterTab";
import { ScheduledReportsModal } from "./ScheduledReportsModal";
import { EnterpriseReportingPayload, ReportFilters } from "@/lib/enterprise-reporting";

export function ReportsClient() {
  const [activeTab, setActiveTab] = useState<ReportsTabKey>("OVERVIEW");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EnterpriseReportingPayload | null>(null);
  const [scheduledModalOpen, setScheduledModalOpen] = useState(false);

  const [filters, setFilters] = useState<ReportFilters>({
    tenantId: "",
    outletId: null,
    rangePreset: "LAST_30_DAYS",
    orderType: "ALL",
    paymentMethod: "ALL",
  });

  const loadReport = useCallback(async (currentFilters: ReportFilters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (currentFilters.outletId) params.set("outletId", currentFilters.outletId);
      if (currentFilters.rangePreset) params.set("rangePreset", currentFilters.rangePreset);
      if (currentFilters.startDate) params.set("startDate", currentFilters.startDate);
      if (currentFilters.endDate) params.set("endDate", currentFilters.endDate);
      if (currentFilters.orderType && currentFilters.orderType !== "ALL") {
        params.set("orderType", currentFilters.orderType);
      }
      if (currentFilters.paymentMethod && currentFilters.paymentMethod !== "ALL") {
        params.set("paymentMethod", currentFilters.paymentMethod);
      }

      const res = await apiFetch(`/api/reports?${params.toString()}`).then((r) => r.json());
      if (res && res.executiveSummary) {
        setData(res);
      }
    } catch (err) {
      console.error("Failed to load enterprise reporting data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(filters);
  }, [filters, loadReport]);

  const handleFilterChange = (updates: Partial<ReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Page Title & Scope Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">
            Enterprise Reports, Analytics & Financial Intelligence
          </h1>
          <p className="text-sm text-[#718078]">
            Executive dashboards, sales velocity, GSTR-1 tax, inventory valuation, cash variance & audit trails
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white border border-[#E5EBE7] px-3.5 py-1 text-xs text-[#718078] font-bold shadow-2xs">
              Period: {data.dateRange.label}
            </span>
          </div>
        )}
      </div>

      {/* Global Filter Bar */}
      <ReportsHeaderBar
        filters={filters}
        onFilterChange={handleFilterChange}
        outlets={data?.outlets || []}
        onRefresh={() => loadReport(filters)}
        loading={loading}
        onOpenExports={() => setActiveTab("EXPORTS")}
        onOpenSchedules={() => setScheduledModalOpen(true)}
      />

      {/* Navigation Tabs */}
      <ReportsNavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unresolvedAlertsCount={data?.inventoryAnalytics?.lowStockCount || 0}
      />

      {/* Active Tab Panel */}
      {loading && !data ? (
        <div className="py-24 text-center text-xs text-[#718078] animate-pulse">
          Computing enterprise analytics from authorized database records...
        </div>
      ) : data ? (
        <>
          {activeTab === "OVERVIEW" && <OverviewTab data={data} />}
          {activeTab === "SALES" && <SalesAnalyticsTab data={data} />}
          {activeTab === "PRODUCTS" && <ProductAnalyticsTab data={data} />}
          {activeTab === "INVENTORY" && <InventoryAnalyticsTab data={data} />}
          {activeTab === "FINANCIAL" && <FinancialAccountingTab data={data} />}
          {activeTab === "GST_TAX" && <GstTaxReportsTab data={data} />}
          {activeTab === "OUTLETS" && <OutletPerformanceTab data={data} />}
          {activeTab === "STAFF" && <StaffAnalyticsTab data={data} />}
          {activeTab === "CUSTOMERS" && <CustomerAnalyticsTab data={data} />}
          {activeTab === "AUDIT" && <AuditLogsTab />}
          {activeTab === "EXPORTS" && (
            <ExportCenterTab filters={filters} dateRangeLabel={data.dateRange.label} />
          )}
          {activeTab === "SCHEDULES" && (
            <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 text-center space-y-3">
              <h3 className="text-base font-black text-[#172B25]">Scheduled Reports & Automation</h3>
              <p className="text-xs text-[#718078] max-w-md mx-auto">
                Configure automated end-of-day sales Z-reports, weekly financial digests, and low stock alert dispatches.
              </p>
              <button
                onClick={() => setScheduledModalOpen(true)}
                className="rounded-xl bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold px-5 py-2.5 shadow-xs cursor-pointer"
              >
                Manage Scheduled Dispatches
              </button>
            </div>
          )}
        </>
      ) : null}

      {/* Scheduled Reports Modal */}
      <ScheduledReportsModal
        isOpen={scheduledModalOpen}
        onClose={() => setScheduledModalOpen(false)}
        outlets={data?.outlets || []}
      />
    </div>
  );
}
