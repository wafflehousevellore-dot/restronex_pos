"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { CrmMetricsCards } from "./CrmMetricsCards";
import { CrmTabsNav, CrmTabKey } from "./CrmTabsNav";
import { CustomerDirectoryTable } from "./CustomerDirectoryTable";
import { CustomerDossierDrawer } from "./CustomerDossierDrawer";
import { CustomerModal } from "./CustomerModal";
import { LoyaltyProgramView } from "./LoyaltyProgramView";
import { OffersMembershipView } from "./OffersMembershipView";
import { FeedbackManagerView } from "./FeedbackManagerView";
import { MarketingCampaignsView } from "./MarketingCampaignsView";
import { CustomerAnalyticsView } from "./CustomerAnalyticsView";
import {
  LoyaltyConfig,
  MembershipTier,
  Coupon,
  CrmComplaint,
  MarketingCampaign,
} from "@/lib/crm-service";

export function CrmClient() {
  const [activeTab, setActiveTab] = useState<CrmTabKey>("DIRECTORY");
  const [loading, setLoading] = useState(true);

  // Core Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [outlets, setOutlets] = useState<{ id: string; name: string }[]>([]);

  // Loyalty Data
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({
    enabled: true,
    pointsPerHundredRupees: 5,
    rupeesPerPoint: 1,
    minRedemptionPoints: 50,
    maxRedemptionPoints: 500,
    maxDiscountPercentage: 30,
    pointsExpiryDays: 365,
    birthdayBonusPoints: 100,
    welcomeBonusPoints: 50,
  });
  const [loyaltyStats, setLoyaltyStats] = useState({
    totalBalance: 0,
    activeMembers: 0,
    recentIssued: 0,
    recentRedeemed: 0,
  });
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<any[]>([]);

  // Offers Data
  const [membershipTiers, setMembershipTiers] = useState<MembershipTier[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Feedback Data
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<CrmComplaint[]>([]);
  const [feedbackMetrics, setFeedbackMetrics] = useState<any>(null);

  // Marketing Data
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [segmentCounts, setSegmentCounts] = useState<Record<string, { total: number; optedIn: number }>>({});
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState("NOT_CONFIGURED");
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState<string | null>(null);

  // Modal / Drawer States
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Customers
  const loadCustomers = useCallback(async () => {
    try {
      const res = await apiFetch("/api/customers").then((r) => r.json());
      if (res && res.customers) {
        setCustomers(res.customers);
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
  }, []);

  // Load Loyalty
  const loadLoyalty = useCallback(async () => {
    try {
      const res = await apiFetch("/api/customers/loyalty").then((r) => r.json());
      if (res) {
        if (res.config) setLoyaltyConfig(res.config);
        if (res.stats) setLoyaltyStats(res.stats);
        if (res.transactions) setLoyaltyTransactions(res.transactions);
      }
    } catch (err) {
      console.error("Failed to load loyalty data:", err);
    }
  }, []);

  // Load Offers & Coupons
  const loadOffers = useCallback(async () => {
    try {
      const res = await apiFetch("/api/customers/offers").then((r) => r.json());
      if (res) {
        if (res.membershipTiers) setMembershipTiers(res.membershipTiers);
        if (res.coupons) setCoupons(res.coupons);
      }
    } catch (err) {
      console.error("Failed to load offers:", err);
    }
  }, []);

  // Load Feedback
  const loadFeedback = useCallback(async () => {
    try {
      const res = await apiFetch("/api/customers/feedback").then((r) => r.json());
      if (res) {
        if (res.feedbacks) setFeedbacks(res.feedbacks);
        if (res.complaints) setComplaints(res.complaints);
        if (res.metrics) setFeedbackMetrics(res.metrics);
      }
    } catch (err) {
      console.error("Failed to load feedback:", err);
    }
  }, []);

  // Load Campaigns
  const loadCampaigns = useCallback(async () => {
    try {
      const res = await apiFetch("/api/customers/campaigns").then((r) => r.json());
      if (res) {
        setIsWhatsAppConnected(Boolean(res.isWhatsAppConnected));
        setWhatsAppStatus(res.whatsAppStatus || "NOT_CONFIGURED");
        setDisplayPhoneNumber(res.displayPhoneNumber || null);
        if (res.campaigns) setCampaigns(res.campaigns);
        if (res.segmentCounts) setSegmentCounts(res.segmentCounts);
      }
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    }
  }, []);

  // Load Outlets
  const loadOutlets = useCallback(async () => {
    try {
      const res = await apiFetch("/api/outlets").then((r) => r.json());
      if (Array.isArray(res)) {
        setOutlets(res.map((o: any) => ({ id: o.id, name: o.name })));
      }
    } catch {
      // ignore
    }
  }, []);

  // Master Initial Load
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCustomers(),
        loadLoyalty(),
        loadOffers(),
        loadFeedback(),
        loadCampaigns(),
        loadOutlets(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [loadCustomers, loadLoyalty, loadOffers, loadFeedback, loadCampaigns, loadOutlets]);

  useEffect(() => {
    loadAll();
    const timer = setInterval(() => {
      loadCustomers();
      loadLoyalty();
    }, 30000);
    return () => clearInterval(timer);
  }, [loadAll, loadCustomers, loadLoyalty]);

  // Handlers
  const handleSaveCustomer = async (data: any) => {
    const res = await apiFetch(editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers", {
      method: editingCustomer ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json());

    if (res.error) {
      throw new Error(res.error);
    }

    showToast(editingCustomer ? "Customer profile updated!" : "New customer registered!");
    await loadCustomers();
    await loadLoyalty();
  };

  const handleSaveLoyaltyConfig = async (updated: Partial<LoyaltyConfig>) => {
    const res = await apiFetch("/api/customers/loyalty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "UPDATE_CONFIG", config: updated }),
    }).then((r) => r.json());

    if (res.error) {
      throw new Error(res.error);
    }

    setLoyaltyConfig(res.config);
    showToast("Loyalty program rules saved successfully!");
  };

  const handleSaveTiers = async (tiers: MembershipTier[]) => {
    const res = await apiFetch("/api/customers/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SAVE_TIERS", tiers }),
    }).then((r) => r.json());

    if (res.error) throw new Error(res.error);
    if (res.offers?.membershipTiers) setMembershipTiers(res.offers.membershipTiers);
    showToast("Membership tiers updated!");
  };

  const handleSaveCoupon = async (coupon: Partial<Coupon>) => {
    const res = await apiFetch("/api/customers/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SAVE_COUPON", coupon }),
    }).then((r) => r.json());

    if (res.error) throw new Error(res.error);
    if (res.offers?.coupons) setCoupons(res.offers.coupons);
    showToast(`Coupon "${coupon.code}" saved successfully!`);
  };

  const handleToggleCoupon = async (couponId: string) => {
    const res = await apiFetch("/api/customers/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "TOGGLE_COUPON", couponId }),
    }).then((r) => r.json());

    if (res.offers?.coupons) setCoupons(res.offers.coupons);
  };

  const handleDeleteCoupon = async (couponId: string) => {
    const res = await apiFetch("/api/customers/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DELETE_COUPON", couponId }),
    }).then((r) => r.json());

    if (res.offers?.coupons) setCoupons(res.offers.coupons);
    showToast("Coupon removed.");
  };

  const handleResolveComplaint = async (complaintId: string, updates: Partial<CrmComplaint>) => {
    const res = await apiFetch("/api/customers/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaintId, ...updates }),
    }).then((r) => r.json());

    if (res.error) throw new Error(res.error);
    showToast("Complaint resolution updated!");
    await loadFeedback();
  };

  const handleCreateCampaign = async (campaignData: any) => {
    const res = await apiFetch("/api/customers/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CREATE_CAMPAIGN", ...campaignData }),
    }).then((r) => r.json());

    if (res.error) throw new Error(res.error);
    showToast("Campaign broadcast created!");
    await loadCampaigns();
  };

  const handleDispatchCampaign = async (campaignId: string) => {
    const res = await apiFetch("/api/customers/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DISPATCH_CAMPAIGN", campaignId }),
    }).then((r) => r.json());

    if (res.error) throw new Error(res.error);
    showToast(`Dispatched to ${res.sentCount} opted-in diners!`);
    await loadCampaigns();
  };

  return (
    <div className="space-y-6 text-[#172B25]">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl p-4 shadow-xl text-xs font-bold transition-all animate-in slide-in-from-bottom duration-200 ${
            toast.type === "success"
              ? "bg-[#172B25] text-white border border-[#16845B]"
              : "bg-red-900 text-white border border-red-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Page Title & Subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">
            Customer Loyalty, CRM & Engagement
          </h1>
          <p className="text-sm text-[#718078]">
            Petpooja-standard diner directory, points rewards engine, memberships, feedback & WhatsApp campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white border border-[#E5EBE7] px-3.5 py-1 text-xs text-[#718078] font-bold shadow-2xs">
            {customers.length} Registered Diners
          </span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <CrmMetricsCards metrics={metrics} feedbackMetrics={feedbackMetrics} />

      {/* Navigation Tabs */}
      <CrmTabsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unresolvedCount={feedbackMetrics?.unresolvedCount || 0}
        whatsAppSetupRequired={!isWhatsAppConnected}
      />

      {/* Tab Panels */}
      {activeTab === "DIRECTORY" && (
        <CustomerDirectoryTable
          customers={customers}
          loading={loading}
          onRefresh={loadCustomers}
          onSelectCustomer={(id) => setSelectedCustomerId(id)}
          onEditCustomer={(cust) => {
            setEditingCustomer(cust);
            setCustomerModalOpen(true);
          }}
          onAddCustomer={() => {
            setEditingCustomer(null);
            setCustomerModalOpen(true);
          }}
          outlets={outlets}
        />
      )}

      {activeTab === "LOYALTY" && (
        <LoyaltyProgramView
          config={loyaltyConfig}
          stats={loyaltyStats}
          transactions={loyaltyTransactions}
          onSaveConfig={handleSaveLoyaltyConfig}
          loading={loading}
        />
      )}

      {activeTab === "OFFERS" && (
        <OffersMembershipView
          tiers={membershipTiers}
          coupons={coupons}
          onSaveTiers={handleSaveTiers}
          onSaveCoupon={handleSaveCoupon}
          onToggleCoupon={handleToggleCoupon}
          onDeleteCoupon={handleDeleteCoupon}
          outlets={outlets}
          loading={loading}
        />
      )}

      {activeTab === "FEEDBACK" && (
        <FeedbackManagerView
          feedbacks={feedbacks}
          complaints={complaints}
          metrics={
            feedbackMetrics || {
              total: feedbacks.length,
              avgRating: "5.0",
              npsScore: 100,
              csatPercent: 100,
              promoters: feedbacks.length,
              passives: 0,
              detractors: 0,
              starCounts: [],
              unresolvedCount: 0,
            }
          }
          onResolveComplaint={handleResolveComplaint}
          onRefresh={loadFeedback}
          loading={loading}
        />
      )}

      {activeTab === "CAMPAIGNS" && (
        <MarketingCampaignsView
          isWhatsAppConnected={isWhatsAppConnected}
          whatsAppStatus={whatsAppStatus}
          displayPhoneNumber={displayPhoneNumber}
          campaigns={campaigns}
          segmentCounts={segmentCounts}
          onCreateCampaign={handleCreateCampaign}
          onDispatchCampaign={handleDispatchCampaign}
          loading={loading}
        />
      )}

      {activeTab === "ANALYTICS" && (
        <CustomerAnalyticsView
          customers={customers}
          metrics={
            metrics || {
              totalCustomers: customers.length,
              totalRevenuePaise: 0,
              averageOrderValuePaise: 0,
              repeatCustomerRate: 0,
              repeatCustomersCount: 0,
            }
          }
        />
      )}

      {/* Customer Dossier Drawer */}
      <CustomerDossierDrawer
        isOpen={Boolean(selectedCustomerId)}
        onClose={() => setSelectedCustomerId(null)}
        customerId={selectedCustomerId}
        onEdit={(cust) => {
          setEditingCustomer(cust);
          setCustomerModalOpen(true);
        }}
        onRefreshList={loadCustomers}
      />

      {/* Add / Edit Customer Modal */}
      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => {
          setCustomerModalOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveCustomer}
        customer={editingCustomer}
        outlets={outlets}
      />
    </div>
  );
}
