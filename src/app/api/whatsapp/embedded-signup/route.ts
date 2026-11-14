import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { completeMetaEmbeddedSignup } from "@/lib/meta-whatsapp-onboarding";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tenantId = await resolveTenantId(userId, body?.tenantId);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem || !["OWNER", "HEAD_OFFICE"].includes(mem.role)) {
    return NextResponse.json(
      { error: "Only organization owners or head-office admins can connect WhatsApp Business." },
      { status: 403 }
    );
  }

  const res = await completeMetaEmbeddedSignup({
    tenantId,
    userId,
    outletId: body?.outletId || null,
    code: String(body?.code || ""),
    wabaId: body?.wabaId || null,
    phoneNumberId: body?.phoneNumberId || null,
    businessId: body?.businessId || null,
    coexistenceRequested: Boolean(body?.coexistenceRequested),
    eventType: body?.eventType || null,
    pin: body?.pin ? String(body.pin) : null,
    deliverySettings: body?.deliverySettings || undefined,
  });

  if (!res.ok && "code" in res) {
    return NextResponse.json(
      {
        ok: false,
        code: res.code,
        error: res.error,
        supportedAlternative: res.supportedAlternative,
        missingPrerequisites: res.missingPrerequisites,
      },
      { status: res.status }
    );
  }

  if (!("displayPhone" in res)) {
    return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    status: res.status,
    displayPhone: res.displayPhone,
    connectionMode: res.connectionMode,
    isCoexistence: res.isCoexistence,
    connectedAt: res.connectedAt,
    lastVerifiedAt: res.lastVerifiedAt,
    message: `WhatsApp Business ${res.displayPhone} verified and connected via Meta.`,
  });
}

