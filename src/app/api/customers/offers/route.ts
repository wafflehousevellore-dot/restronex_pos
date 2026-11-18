import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import {
  getOffersConfig,
  saveOffersConfig,
  validateCouponEligibility,
  Coupon,
  MembershipTier,
} from "@/lib/crm-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const offers = await getOffersConfig(tenantId);
  return NextResponse.json(offers);
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action } = body;

  const current = await getOffersConfig(tenantId);

  // 1. Save Membership Tiers
  if (action === "SAVE_TIERS") {
    const { tiers } = body;
    if (!Array.isArray(tiers)) {
      return NextResponse.json({ error: "Tiers array required" }, { status: 400 });
    }
    const updated = await saveOffersConfig(tenantId, { membershipTiers: tiers });
    return NextResponse.json({ success: true, offers: updated });
  }

  // 2. Save / Upsert Coupon
  if (action === "SAVE_COUPON") {
    const { coupon } = body;
    if (!coupon || !coupon.code || !coupon.title) {
      return NextResponse.json({ error: "Coupon code and title are required." }, { status: 400 });
    }

    const cleanCode = coupon.code.trim().toUpperCase();
    const existingIndex = current.coupons.findIndex(
      (c) => c.id === coupon.id || c.code.toUpperCase() === cleanCode
    );

    const couponRecord: Coupon = {
      id: coupon.id || `coupon-${Date.now()}`,
      code: cleanCode,
      title: coupon.title.trim(),
      discountType: coupon.discountType === "PERCENT" ? "PERCENT" : "FLAT",
      discountValue: Number(coupon.discountValue || 0),
      minOrderValuePaise: Number(coupon.minOrderValuePaise || 0),
      maxDiscountPaise: Number(coupon.maxDiscountPaise || 0),
      validFrom: coupon.validFrom || new Date().toISOString(),
      validUntil: coupon.validUntil || new Date(Date.now() + 90 * 86400000).toISOString(),
      usageLimitTotal: Number(coupon.usageLimitTotal || 0),
      usageLimitPerCustomer: Number(coupon.usageLimitPerCustomer || 1),
      usedCount: existingIndex >= 0 ? current.coupons[existingIndex].usedCount : 0,
      applicableSegments: Array.isArray(coupon.applicableSegments) && coupon.applicableSegments.length ? coupon.applicableSegments : ["ALL"],
      outletIds: Array.isArray(coupon.outletIds) ? coupon.outletIds : [],
      isActive: coupon.isActive ?? true,
      allowStackingWithLoyalty: Boolean(coupon.allowStackingWithLoyalty),
    };

    const newCoupons = [...current.coupons];
    if (existingIndex >= 0) {
      newCoupons[existingIndex] = couponRecord;
    } else {
      newCoupons.unshift(couponRecord);
    }

    const updated = await saveOffersConfig(tenantId, { coupons: newCoupons });
    return NextResponse.json({ success: true, coupon: couponRecord, offers: updated });
  }

  // 3. Validate Coupon for POS / Billing
  if (action === "VALIDATE_COUPON") {
    const { code, orderSubtotalPaise, customerPhone, outletId } = body;
    if (!code) {
      return NextResponse.json({ error: "Coupon code required." }, { status: 400 });
    }

    const result = await validateCouponEligibility(
      tenantId,
      code,
      Number(orderSubtotalPaise || 0),
      customerPhone,
      outletId
    );

    return NextResponse.json(result);
  }

  // 4. Toggle Active Status
  if (action === "TOGGLE_COUPON") {
    const { couponId } = body;
    const newCoupons = current.coupons.map((c) =>
      c.id === couponId ? { ...c, isActive: !c.isActive } : c
    );
    const updated = await saveOffersConfig(tenantId, { coupons: newCoupons });
    return NextResponse.json({ success: true, offers: updated });
  }

  // 5. Delete Coupon
  if (action === "DELETE_COUPON") {
    const { couponId } = body;
    const newCoupons = current.coupons.filter((c) => c.id !== couponId);
    const updated = await saveOffersConfig(tenantId, { coupons: newCoupons });
    return NextResponse.json({ success: true, offers: updated });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
