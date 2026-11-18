import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

const TAX_SETTINGS_PROVIDER = "restaurant_tax_policy";

export interface RestaurantTaxPolicy {
  pricingMode: "INCLUSIVE" | "EXCLUSIVE"; // Tax included in menu prices vs added at checkout
  gstScheme: "REGULAR" | "COMPOSITION";  // 5% no-ITC composition vs regular GST
  gstNumber?: string | null;
  legalEntityName?: string | null;
  defaultSacCode: string;
  enableCgstSgstSplit: boolean;
  enableIgstForInterstate: boolean;
  roundOffTotal: boolean;
}

const DEFAULT_TAX_POLICY: RestaurantTaxPolicy = {
  pricingMode: "EXCLUSIVE",
  gstScheme: "REGULAR",
  defaultSacCode: "996331", // Restaurant & food delivery service
  enableCgstSgstSplit: true,
  enableIgstForInterstate: true,
  roundOffTotal: true,
};

/**
 * GET /api/tax
 * Retrieves tenant tax configuration, active tax rates, and GST policy.
 */
export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const [taxConfigs, setting, configRow, categories] = await Promise.all([
    prisma.taxConfig.findMany({
      where: { tenantId },
      orderBy: { rateBps: "asc" },
    }),
    prisma.restaurantSetting.findUnique({
      where: { tenantId },
      select: { gstNumber: true, fssaiNumber: true, serviceChargePct: true },
    }),
    prisma.integrationConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider: TAX_SETTINGS_PROVIDER } },
    }),
    prisma.menuCategory.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    }),
  ]);

  let policy: RestaurantTaxPolicy = { ...DEFAULT_TAX_POLICY };
  if (configRow?.configJson) {
    try {
      policy = { ...DEFAULT_TAX_POLICY, ...JSON.parse(configRow.configJson) };
    } catch {
      policy = { ...DEFAULT_TAX_POLICY };
    }
  }

  // Merge GST number from restaurantSetting if present
  if (setting?.gstNumber) {
    policy.gstNumber = setting.gstNumber;
  }

  // If no tax configs exist, provide standard Indian restaurant GST defaults
  let finalTaxConfigs = taxConfigs;
  if (finalTaxConfigs.length === 0) {
    finalTaxConfigs = [
      { id: "tax_cgst_2_5", tenantId, name: "CGST (2.5%)", rateBps: 250, isActive: true },
      { id: "tax_sgst_2_5", tenantId, name: "SGST (2.5%)", rateBps: 250, isActive: true },
    ] as any;
  }

  return NextResponse.json({
    ok: true,
    policy,
    taxConfigs: finalTaxConfigs,
    categories,
    serviceChargePct: setting?.serviceChargePct || 0,
    fssaiNumber: setting?.fssaiNumber || null,
  });
}

/**
 * POST /api/tax
 * Create or update a tax rate item in TaxConfig.
 */
export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const membership = await prisma.membership.findFirst({
    where: { userId, tenantId },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "MANAGER" && membership.role !== "HEAD_OFFICE")) {
    return NextResponse.json({ error: "Insufficient permissions to configure taxes" }, { status: 403 });
  }

  const { id, name, ratePct, rateBps, isActive } = body;
  if (!name) return NextResponse.json({ error: "Tax rate name required" }, { status: 400 });

  const computedBps = rateBps !== undefined ? Number(rateBps) : Math.round((Number(ratePct) || 0) * 100);

  let taxItem;
  if (id) {
    taxItem = await prisma.taxConfig.update({
      where: { id },
      data: {
        name: name.trim(),
        rateBps: computedBps,
        isActive: isActive !== undefined ? !!isActive : true,
      },
    });
  } else {
    taxItem = await prisma.taxConfig.create({
      data: {
        tenantId,
        name: name.trim(),
        rateBps: computedBps,
        isActive: isActive !== undefined ? !!isActive : true,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: id ? "TAX_RATE_UPDATED" : "TAX_RATE_CREATED",
      entity: "TaxConfig",
      entityId: taxItem.id,
      metadataJson: JSON.stringify({ name, rateBps: computedBps }),
    },
  });

  return NextResponse.json({ ok: true, taxConfig: taxItem });
}

/**
 * PATCH /api/tax
 * Update GST Policy (pricing mode, GSTIN, scheme, SAC code).
 */
export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const membership = await prisma.membership.findFirst({
    where: { userId, tenantId },
  });
  if (!membership || (membership.role !== "OWNER" && membership.role !== "MANAGER" && membership.role !== "HEAD_OFFICE")) {
    return NextResponse.json({ error: "Insufficient permissions to update tax policy" }, { status: 403 });
  }

  const {
    pricingMode,
    gstScheme,
    gstNumber,
    legalEntityName,
    defaultSacCode,
    enableCgstSgstSplit,
    enableIgstForInterstate,
    roundOffTotal,
    serviceChargePct,
    fssaiNumber,
  } = body;

  const existingConfig = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: TAX_SETTINGS_PROVIDER } },
  });

  let policy: RestaurantTaxPolicy = { ...DEFAULT_TAX_POLICY };
  if (existingConfig?.configJson) {
    try {
      policy = { ...DEFAULT_TAX_POLICY, ...JSON.parse(existingConfig.configJson) };
    } catch {
      policy = { ...DEFAULT_TAX_POLICY };
    }
  }

  if (pricingMode) policy.pricingMode = pricingMode;
  if (gstScheme) policy.gstScheme = gstScheme;
  if (gstNumber !== undefined) policy.gstNumber = gstNumber?.trim() || null;
  if (legalEntityName !== undefined) policy.legalEntityName = legalEntityName?.trim() || null;
  if (defaultSacCode) policy.defaultSacCode = defaultSacCode.trim();
  if (enableCgstSgstSplit !== undefined) policy.enableCgstSgstSplit = !!enableCgstSgstSplit;
  if (enableIgstForInterstate !== undefined) policy.enableIgstForInterstate = !!enableIgstForInterstate;
  if (roundOffTotal !== undefined) policy.roundOffTotal = !!roundOffTotal;

  await prisma.integrationConfig.upsert({
    where: { tenantId_provider: { tenantId, provider: TAX_SETTINGS_PROVIDER } },
    create: {
      tenantId,
      provider: TAX_SETTINGS_PROVIDER,
      status: "ACTIVE",
      configJson: JSON.stringify(policy),
      lastSyncAt: new Date(),
    },
    update: {
      configJson: JSON.stringify(policy),
      lastSyncAt: new Date(),
    },
  });

  // Also update RestaurantSetting if GSTIN, FSSAI, or service charge provided
  if (gstNumber !== undefined || fssaiNumber !== undefined || serviceChargePct !== undefined) {
    await prisma.restaurantSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        gstNumber: gstNumber?.trim() || null,
        fssaiNumber: fssaiNumber?.trim() || null,
        serviceChargePct: Number(serviceChargePct) || 0,
      },
      update: {
        ...(gstNumber !== undefined ? { gstNumber: gstNumber?.trim() || null } : {}),
        ...(fssaiNumber !== undefined ? { fssaiNumber: fssaiNumber?.trim() || null } : {}),
        ...(serviceChargePct !== undefined ? { serviceChargePct: Number(serviceChargePct) || 0 } : {}),
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "TAX_POLICY_UPDATED",
      entity: "RestaurantSetting",
      metadataJson: JSON.stringify(policy),
    },
  });

  return NextResponse.json({ ok: true, policy });
}
