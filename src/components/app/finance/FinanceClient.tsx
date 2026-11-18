"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FinanceMetricsCards } from "./FinanceMetricsCards";
import { FinanceTabsNav, FinanceTabMode } from "./FinanceTabsNav";
import { FinancialOverviewView } from "./FinancialOverviewView";
import { DayEndClosingManager, DayEndSummaryRow } from "./DayEndClosingManager";
import { DayEndModal } from "./DayEndModal";
import { TaxConfigurationView } from "./TaxConfigurationView";
import { PaymentReconciliationView } from "./PaymentReconciliationView";
import { FinancialReportsView } from "./FinancialReportsView";
import { FinanceSummaryData } from "@/app/api/finance/route";
import { RestaurantTaxPolicy } from "@/app/api/tax/route";
import { ReconciliationItem } from "@/app/api/reconciliation/route";
import { RotateCw, AlertCircle } from "lucide-react";

export function FinanceClient() {
  const [activeTab, setActiveTab] = useState<FinanceTabMode>("overview");
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedOutlet, setSelectedOutlet] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState<FinanceSummaryData | null>(null);
  const [dayEnds, setDayEnds] = useState<DayEndSummaryRow[]>([]);
  const [reconciliationItems, setReconciliationItems] = useState<ReconciliationItem[]>([]);
  const [reconciliationSummary, setReconciliationSummary] = useState<any>({
    totalAuditedOrders: 0,
    matchedPaise: 0,
    discrepancyPaise: 0,
    pendingGatewayPaise: 0,
    aggregatorVolumePaise: 0,
    matchedCount: 0,
    discrepancyCount: 0,
  });
  const [taxPolicy, setTaxPolicy] = useState<RestaurantTaxPolicy>({
    pricingMode: "EXCLUSIVE",
    gstScheme: "REGULAR",
    defaultSacCode: "996331",
    enableCgstSgstSplit: true,
    enableIgstForInterstate: true,
    roundOffTotal: true,
  });
  const [taxConfigs, setTaxConfigs] = useState<any[]>([]);
  const [fssaiNumber, setFssaiNumber] = useState<string | null>(null);
  const [serviceChargePct, setServiceChargePct] = useState(0);

  // Modals
  const [isDayEndModalOpen, setIsDayEndModalOpen] = useState(false);

  // Load Finance Summary
  const loadFinanceData = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance?days=${selectedDays}&outletId=${selectedOutlet}`);
      if (res.ok) {
        const j = await res.json();
        setFinanceData(j);
      }
    } catch {
      console.warn("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, [selectedDays, selectedOutlet]);

  // Load Day-End Summaries
  const loadDayEnds = useCallback(async () => {
    try {
      const res = await fetch(`/api/day-end?outletId=${selectedOutlet}`);
      if (res.ok) {
        const j = await res.json();
        setDayEnds(j || []);
      }
    } catch {
      console.warn("Failed to load day-end records");
    }
  }, [selectedOutlet]);

  // Load Reconciliation
  const loadReconciliation = useCallback(async () => {
    try {
      const res = await fetch(`/api/reconciliation?outletId=${selectedOutlet}`);
      if (res.ok) {
        const j = await res.json();
        setReconciliationItems(j.items || []);
        if (j.summary) setReconciliationSummary(j.summary);
      }
    } catch {
      console.warn("Failed to load reconciliation");
    }
  }, [selectedOutlet]);

  // Load Taxes
  const loadTaxes = useCallback(async () => {
    try {
      const res = await fetch("/api/tax");
      if (res.ok) {
        const j = await res.json();
        if (j.policy) setTaxPolicy(j.policy);
        if (j.taxConfigs) setTaxConfigs(j.taxConfigs);
        if (j.fssaiNumber) setFssaiNumber(j.fssaiNumber);
        if (j.serviceChargePct !== undefined) setServiceChargePct(j.serviceChargePct);
      }
    } catch {
      console.warn("Failed to load taxes");
    }
  }, []);

  // Initial load and periodic polling
  useEffect(() => {
    loadFinanceData();
    loadDayEnds();
    loadReconciliation();
    loadTaxes();

    const interval = setInterval(() => {
      loadFinanceData();
      loadDayEnds();
    }, 25000);

    return () => clearInterval(interval);
  }, [loadFinanceData, loadDayEnds, loadReconciliation, loadTaxes]);

  function handleExportCsv() {
    window.open(`/api/reports/export?type=daily&days=${selectedDays}`, "_blank");
  }

  const outlets = financeData?.outlets || [];

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#172B25]">
          Restaurant Finance, Tax &amp; Day-End Closing
        </h1>
        <p className="text-xs text-[#718078] mt-0.5">
          Comprehensive financial ledger, GST tax configuration, tender reconciliation, and cashier Z-reports.
        </p>
      </div>

      {/* KPI Metrics Summary Bar */}
      {financeData ? (
        <FinanceMetricsCards
          grossSalesPaise={financeData.grossSalesPaise}
          netSalesPaise={financeData.netSalesPaise}
          totalTaxPaise={financeData.totalTaxPaise}
          cgstPaise={financeData.cgstPaise}
          sgstPaise={financeData.sgstPaise}
          discountPaise={financeData.discountPaise}
          refundedPaise={financeData.refundedPaise}
          ordersCount={financeData.completedOrdersCount}
          avgOrderValuePaise={financeData.avgOrderValuePaise}
          salesGrowthPct={financeData.salesGrowthPct}
          complimentaryOrdersCount={financeData.complimentaryOrdersCount}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-[#E5EBE7] bg-white p-4" />
          ))}
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <FinanceTabsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedDays={selectedDays}
        onDaysChange={setSelectedDays}
        selectedOutlet={selectedOutlet}
        onOutletChange={setSelectedOutlet}
        outlets={outlets}
        onOpenDayEndModal={() => setIsDayEndModalOpen(true)}
        onExportCsv={handleExportCsv}
        isOwnerOrManager={true}
      />

      {/* View Switcher */}
      {loading && !financeData ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-[#E5EBE7] bg-white">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#718078]">
            <RotateCw className="h-4 w-4 animate-spin text-[#16845B]" />
            <span>Loading financial data from database...</span>
          </div>
        </div>
      ) : (
        <>
          {activeTab === "overview" && financeData && (
            <FinancialOverviewView data={financeData} />
          )}

          {activeTab === "dayend" && (
            <DayEndClosingManager
              dayEnds={dayEnds}
              outlets={outlets}
              onOpenDayEndModal={() => setIsDayEndModalOpen(true)}
              onRefresh={() => {
                loadDayEnds();
                loadFinanceData();
              }}
              isOwnerOrManager={true}
            />
          )}

          {activeTab === "tax" && (
            <TaxConfigurationView
              policy={taxPolicy}
              taxConfigs={taxConfigs}
              fssaiNumber={fssaiNumber}
              serviceChargePct={serviceChargePct}
              onRefresh={loadTaxes}
              isOwnerOrManager={true}
            />
          )}

          {activeTab === "reconciliation" && (
            <PaymentReconciliationView
              items={reconciliationItems}
              summary={reconciliationSummary}
              outlets={outlets}
              onRefresh={() => {
                loadReconciliation();
                loadFinanceData();
              }}
              isOwnerOrManager={true}
            />
          )}

          {activeTab === "reports" && financeData && (
            <FinancialReportsView
              data={financeData}
              onRefresh={loadFinanceData}
            />
          )}
        </>
      )}

      {/* Day End Modal */}
      <DayEndModal
        isOpen={isDayEndModalOpen}
        onClose={() => setIsDayEndModalOpen(false)}
        outlets={outlets}
        onDayEndCompleted={() => {
          loadDayEnds();
          loadFinanceData();
        }}
      />
    </div>
  );
}
