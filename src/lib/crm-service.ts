import { prisma } from "@/lib/db";
import { resolveWhatsAppConfig, normalizeWhatsAppPhone } from "@/lib/whatsapp-invoice";

export interface CrmCustomerMeta {
  birthday?: string; // YYYY-MM-DD
  anniversary?: string; // YYYY-MM-DD
  tags?: string[];
  notes?: string;
  preferredOutletId?: string;
}

export interface LoyaltyConfig {
  enabled: boolean;
  pointsPerHundredRupees: number; // e.g. 5 = 5 pts per ₹100 spent (5%)
  rupeesPerPoint: number; // e.g. 1 = 1 pt is worth ₹1
  minRedemptionPoints: number; // min points to redeem, e.g. 50
  maxRedemptionPoints: number; // max points redeemable per bill, e.g. 500
  maxDiscountPercentage: number; // max % of bill that can be paid via points, e.g. 30%
  pointsExpiryDays: number; // e.g. 365
  birthdayBonusPoints: number; // e.g. 100
  welcomeBonusPoints: number; // e.g. 50
}

export interface MembershipTier {
  id: string;
  name: string;
  minSpendPaise: number; // e.g. 0, 500000 (₹5k), 1500000 (₹15k), 3500000 (₹35k)
  pointsMultiplier: number; // 1.0, 1.25, 1.5, 2.0
  discountPercent: number; // e.g. 0%, 5%, 10%, 15%
  color: string;
  badge: string;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  discountType: "FLAT" | "PERCENT";
  discountValue: number; // ₹100 or 15%
  minOrderValuePaise: number;
  maxDiscountPaise: number;
  validFrom: string; // ISO
  validUntil: string; // ISO
  usageLimitTotal: number;
  usageLimitPerCustomer: number;
  usedCount: number;
  applicableSegments: string[]; // ["ALL"] or ["VIP", "NEW"]
  outletIds: string[]; // empty means all outlets
  isActive: boolean;
  allowStackingWithLoyalty?: boolean;
}

export interface CrmComplaint {
  id: string;
  feedbackId?: string;
  customerPhone: string;
  customerName: string;
  rating: number;
  comment?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  assignedStaff?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface MarketingCampaign {
  id: string;
  title: string;
  type: "BIRTHDAY" | "WINBACK" | "INACTIVE" | "WELCOME" | "LOYALTY_MILESTONE" | "ANNOUNCEMENT";
  segment: string;
  channel: "WHATSAPP";
  status: "DRAFT" | "SCHEDULED" | "RUNNING" | "COMPLETED" | "FAILED";
  scheduledAt?: string;
  sentAt?: string;
  targetAudienceCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  messageTemplate: string;
  couponCode?: string;
  createdAt: string;
}

const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  enabled: true,
  pointsPerHundredRupees: 5,
  rupeesPerPoint: 1,
  minRedemptionPoints: 50,
  maxRedemptionPoints: 500,
  maxDiscountPercentage: 30,
  pointsExpiryDays: 365,
  birthdayBonusPoints: 100,
  welcomeBonusPoints: 50,
};

const DEFAULT_TIERS: MembershipTier[] = [
  { id: "tier-bronze", name: "Bronze Member", minSpendPaise: 0, pointsMultiplier: 1.0, discountPercent: 0, color: "text-amber-800 bg-amber-50 border-amber-200", badge: "BRONZE" },
  { id: "tier-silver", name: "Silver Gourmet", minSpendPaise: 500000, pointsMultiplier: 1.25, discountPercent: 5, color: "text-slate-700 bg-slate-100 border-slate-300", badge: "SILVER" },
  { id: "tier-gold", name: "Gold Connoisseur", minSpendPaise: 1500000, pointsMultiplier: 1.5, discountPercent: 10, color: "text-amber-900 bg-amber-100 border-amber-400", badge: "GOLD" },
  { id: "tier-platinum", name: "Platinum Royal", minSpendPaise: 3500000, pointsMultiplier: 2.0, discountPercent: 15, color: "text-emerald-900 bg-emerald-100 border-emerald-400", badge: "PLATINUM" },
];

const DEFAULT_COUPONS: Coupon[] = [
  {
    id: "c-welcome",
    code: "WELCOME100",
    title: "Welcome Flat ₹100 Off",
    discountType: "FLAT",
    discountValue: 100,
    minOrderValuePaise: 50000, // ₹500
    maxDiscountPaise: 10000, // ₹100
    validFrom: new Date(Date.now() - 30 * 86400000).toISOString(),
    validUntil: new Date(Date.now() + 180 * 86400000).toISOString(),
    usageLimitTotal: 1000,
    usageLimitPerCustomer: 1,
    usedCount: 38,
    applicableSegments: ["ALL", "NEW"],
    outletIds: [],
    isActive: true,
    allowStackingWithLoyalty: false,
  },
  {
    id: "c-vip20",
    code: "ROYAL20",
    title: "20% Exclusive Off for VIP Guests",
    discountType: "PERCENT",
    discountValue: 20,
    minOrderValuePaise: 120000, // ₹1200
    maxDiscountPaise: 50000, // ₹500
    validFrom: new Date(Date.now() - 10 * 86400000).toISOString(),
    validUntil: new Date(Date.now() + 120 * 86400000).toISOString(),
    usageLimitTotal: 250,
    usageLimitPerCustomer: 3,
    usedCount: 19,
    applicableSegments: ["VIP"],
    outletIds: [],
    isActive: true,
    allowStackingWithLoyalty: true,
  },
  {
    id: "c-winback15",
    code: "COMEBACK15",
    title: "15% Win-Back Delight",
    discountType: "PERCENT",
    discountValue: 15,
    minOrderValuePaise: 60000, // ₹600
    maxDiscountPaise: 30000, // ₹300
    validFrom: new Date(Date.now() - 15 * 86400000).toISOString(),
    validUntil: new Date(Date.now() + 90 * 86400000).toISOString(),
    usageLimitTotal: 500,
    usageLimitPerCustomer: 1,
    usedCount: 14,
    applicableSegments: ["AT_RISK", "CHURNED"],
    outletIds: [],
    isActive: true,
    allowStackingWithLoyalty: false,
  },
];

const DEFAULT_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: "camp-welcome",
    title: "First-Timer Welcome & Special Offer",
    type: "WELCOME",
    segment: "NEW",
    channel: "WHATSAPP",
    status: "COMPLETED",
    sentAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    targetAudienceCount: 45,
    deliveredCount: 43,
    readCount: 39,
    failedCount: 2,
    messageTemplate: "Hi {{name}}! Thank you for dining with us at RestroNex. Use code WELCOME100 on your next visit for flat ₹100 off your meal!",
    couponCode: "WELCOME100",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "camp-winback",
    title: "We Miss You — 15% Comeback Treat",
    type: "WINBACK",
    segment: "AT_RISK",
    channel: "WHATSAPP",
    status: "COMPLETED",
    sentAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    targetAudienceCount: 28,
    deliveredCount: 27,
    readCount: 22,
    failedCount: 1,
    messageTemplate: "Hey {{name}}, it has been a while! Treat yourself this week with 15% off using code COMEBACK15. Valid until Sunday!",
    couponCode: "COMEBACK15",
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: "camp-bday",
    title: "Birthday Month Special Celebration",
    type: "BIRTHDAY",
    segment: "BIRTHDAY_MONTH",
    channel: "WHATSAPP",
    status: "SCHEDULED",
    scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    targetAudienceCount: 14,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
    messageTemplate: "Happy Birthday Month, {{name}}! 🎉 Celebrate with us and enjoy a complimentary Chef's Dessert & 100 bonus loyalty points on your bill!",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

// Helper to retrieve IntegrationConfig JSON safely
async function getIntegrationData<T>(tenantId: string, provider: string, fallback: T): Promise<T> {
  try {
    const record = await prisma.integrationConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider } },
    });
    if (!record || !record.configJson) return fallback;
    return JSON.parse(record.configJson) as T;
  } catch {
    return fallback;
  }
}

// Helper to save IntegrationConfig JSON safely
async function saveIntegrationData<T>(tenantId: string, provider: string, data: T): Promise<void> {
  const configJson = JSON.stringify(data);
  await prisma.integrationConfig.upsert({
    where: { tenantId_provider: { tenantId, provider } },
    create: {
      tenantId,
      provider,
      status: "CONNECTED",
      configJson,
      lastSyncAt: new Date(),
    },
    update: {
      status: "CONNECTED",
      configJson,
      lastSyncAt: new Date(),
    },
  });
}

/**
 * 1. Loyalty Configuration & Engine
 */
export async function getLoyaltyConfig(tenantId: string): Promise<LoyaltyConfig> {
  const config = await getIntegrationData<LoyaltyConfig>(tenantId, "crm_loyalty_config", DEFAULT_LOYALTY_CONFIG);
  return { ...DEFAULT_LOYALTY_CONFIG, ...config };
}

export async function saveLoyaltyConfig(tenantId: string, updates: Partial<LoyaltyConfig>): Promise<LoyaltyConfig> {
  const current = await getLoyaltyConfig(tenantId);
  const updated: LoyaltyConfig = { ...current, ...updates };
  await saveIntegrationData(tenantId, "crm_loyalty_config", updated);
  return updated;
}

/**
 * 2. Membership Tiers & Promotional Offers
 */
export async function getOffersConfig(tenantId: string): Promise<{ membershipTiers: MembershipTier[]; coupons: Coupon[] }> {
  const data = await getIntegrationData<{ membershipTiers: MembershipTier[]; coupons: Coupon[] }>(
    tenantId,
    "crm_offers_coupons",
    { membershipTiers: DEFAULT_TIERS, coupons: DEFAULT_COUPONS }
  );
  return {
    membershipTiers: data.membershipTiers?.length ? data.membershipTiers : DEFAULT_TIERS,
    coupons: data.coupons || DEFAULT_COUPONS,
  };
}

export async function saveOffersConfig(
  tenantId: string,
  payload: { membershipTiers?: MembershipTier[]; coupons?: Coupon[] }
): Promise<{ membershipTiers: MembershipTier[]; coupons: Coupon[] }> {
  const current = await getOffersConfig(tenantId);
  const updated = {
    membershipTiers: payload.membershipTiers || current.membershipTiers,
    coupons: payload.coupons || current.coupons,
  };
  await saveIntegrationData(tenantId, "crm_offers_coupons", updated);
  return updated;
}

/**
 * 3. Validate Coupon Eligibility at POS / Checkout
 */
export async function validateCouponEligibility(
  tenantId: string,
  code: string,
  orderSubtotalPaise: number,
  customerPhone?: string,
  outletId?: string
): Promise<{
  valid: boolean;
  discountPaise: number;
  coupon?: Coupon;
  error?: string;
}> {
  const cleanCode = code.trim().toUpperCase();
  const { coupons } = await getOffersConfig(tenantId);
  const coupon = coupons.find((c) => c.code.toUpperCase() === cleanCode);

  if (!coupon) {
    return { valid: false, discountPaise: 0, error: `Invalid promo coupon code "${cleanCode}".` };
  }

  if (!coupon.isActive) {
    return { valid: false, discountPaise: 0, error: `Coupon "${cleanCode}" is currently inactive.` };
  }

  const now = new Date();
  if (coupon.validFrom && new Date(coupon.validFrom) > now) {
    return { valid: false, discountPaise: 0, error: `Coupon "${cleanCode}" is not yet active.` };
  }

  if (coupon.validUntil && new Date(coupon.validUntil) < now) {
    return { valid: false, discountPaise: 0, error: `Coupon "${cleanCode}" has expired.` };
  }

  if (coupon.outletIds && coupon.outletIds.length > 0 && outletId) {
    if (!coupon.outletIds.includes(outletId)) {
      return { valid: false, discountPaise: 0, error: `Coupon "${cleanCode}" is not valid at this restaurant outlet.` };
    }
  }

  if (orderSubtotalPaise < coupon.minOrderValuePaise) {
    const minRs = Math.round(coupon.minOrderValuePaise / 100);
    return {
      valid: false,
      discountPaise: 0,
      error: `Minimum order subtotal of ₹${minRs} required to apply coupon "${cleanCode}".`,
    };
  }

  if (coupon.usageLimitTotal && coupon.usedCount >= coupon.usageLimitTotal) {
    return { valid: false, discountPaise: 0, error: `Coupon "${cleanCode}" total redemption limit reached.` };
  }

  // Calculate discount
  let discountPaise = 0;
  if (coupon.discountType === "FLAT") {
    discountPaise = Math.min(orderSubtotalPaise, Math.round(coupon.discountValue * 100));
  } else {
    const pctDiscount = Math.round(orderSubtotalPaise * (coupon.discountValue / 100));
    discountPaise = coupon.maxDiscountPaise > 0 ? Math.min(pctDiscount, coupon.maxDiscountPaise) : pctDiscount;
  }

  return {
    valid: true,
    discountPaise,
    coupon,
  };
}

/**
 * 4. Customer Metadata (Birthday, Anniversary, Tags, Notes, Preferred Outlet)
 */
export async function getCustomerMetaMap(tenantId: string): Promise<Record<string, CrmCustomerMeta>> {
  return await getIntegrationData<Record<string, CrmCustomerMeta>>(tenantId, "crm_customer_meta", {});
}

export async function saveCustomerMeta(
  tenantId: string,
  key: string, // customerId or phone
  meta: Partial<CrmCustomerMeta>
): Promise<void> {
  const map = await getCustomerMetaMap(tenantId);
  const current = map[key] || {};
  map[key] = { ...current, ...meta };
  await saveIntegrationData(tenantId, "crm_customer_meta", map);
}

/**
 * 5. Segmentation & Tier Calculations
 */
export function determineCustomerSegment(customer: {
  visitCount: number;
  totalSpentPaise: number;
  lastOrderAt?: Date | string | null;
  birthday?: string;
}): "VIP" | "REGULAR" | "NEW" | "AT_RISK" | "CHURNED" {
  if (customer.visitCount <= 1) return "NEW";
  if (customer.totalSpentPaise >= 1000000 || customer.visitCount >= 8) return "VIP"; // ₹10,000+ or 8+ visits

  if (customer.lastOrderAt) {
    const diffDays = Math.floor((Date.now() - new Date(customer.lastOrderAt).getTime()) / 86400000);
    if (diffDays > 90) return "CHURNED";
    if (diffDays > 45) return "AT_RISK";
  }

  return "REGULAR";
}

export function determineMembershipTier(totalSpentPaise: number, tiers: MembershipTier[]): MembershipTier {
  const sorted = [...tiers].sort((a, b) => b.minSpendPaise - a.minSpendPaise);
  for (const tier of sorted) {
    if (totalSpentPaise >= tier.minSpendPaise) {
      return tier;
    }
  }
  return sorted[sorted.length - 1] || DEFAULT_TIERS[0];
}

/**
 * 6. Feedback & Detractor Complaints Management
 */
export async function getComplaints(tenantId: string): Promise<CrmComplaint[]> {
  const config = await getIntegrationData<{ complaints: CrmComplaint[] }>(tenantId, "crm_feedback_config", {
    complaints: [],
  });
  return config.complaints || [];
}

export async function saveComplaint(tenantId: string, complaint: CrmComplaint): Promise<CrmComplaint> {
  const complaints = await getComplaints(tenantId);
  const existingIdx = complaints.findIndex((c) => c.id === complaint.id);
  if (existingIdx >= 0) {
    complaints[existingIdx] = complaint;
  } else {
    complaints.unshift(complaint);
  }
  await saveIntegrationData(tenantId, "crm_feedback_config", { complaints });
  return complaint;
}

/**
 * 7. Marketing Campaigns
 */
export async function getCampaigns(tenantId: string): Promise<MarketingCampaign[]> {
  const data = await getIntegrationData<{ campaigns: MarketingCampaign[] }>(tenantId, "crm_campaigns_roster", {
    campaigns: DEFAULT_CAMPAIGNS,
  });
  return data.campaigns || DEFAULT_CAMPAIGNS;
}

export async function saveCampaign(tenantId: string, campaign: MarketingCampaign): Promise<MarketingCampaign> {
  const campaigns = await getCampaigns(tenantId);
  const existingIdx = campaigns.findIndex((c) => c.id === campaign.id);
  if (existingIdx >= 0) {
    campaigns[existingIdx] = campaign;
  } else {
    campaigns.unshift(campaign);
  }
  await saveIntegrationData(tenantId, "crm_campaigns_roster", { campaigns });
  return campaign;
}
