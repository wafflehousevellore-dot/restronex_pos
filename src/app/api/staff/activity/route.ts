import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

/**
 * Strips any sensitive credentials, tokens, or payment secrets from audit log metadata.
 */
function sanitizeMetadata(metadataJson: string | null): any {
  if (!metadataJson) return null;
  try {
    const parsed = JSON.parse(metadataJson);
    const sanitized = { ...parsed };

    // Keys to strip or redact
    const sensitiveKeys = [
      "password",
      "token",
      "rawToken",
      "tokenHash",
      "secret",
      "secretEnc",
      "accessToken",
      "apiKey",
      "cvv",
      "cardNumber",
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = "••••••••";
      }
    }

    return sanitized;
  } catch {
    return null;
  }
}

/**
 * GET /api/staff/activity?search=...&action=...&entity=...&limit=50
 * Returns immutable, sanitized staff activity and audit logs scoped to tenant.
 */
export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const search = req.nextUrl.searchParams.get("search");
  const actionParam = req.nextUrl.searchParams.get("action");
  const entityParam = req.nextUrl.searchParams.get("entity");
  const limitParam = parseInt(req.nextUrl.searchParams.get("limit") || "60", 10);

  const rawLogs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      ...(actionParam ? { action: actionParam } : {}),
      ...(entityParam ? { entity: entityParam } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(100, Math.max(10, limitParam)),
  });

  const logs = rawLogs.map((l) => ({
    id: l.id,
    action: l.action,
    entity: l.entity,
    entityId: l.entityId,
    createdAt: l.createdAt.toISOString(),
    user: l.user
      ? {
          id: l.user.id,
          name: l.user.name,
          email: l.user.email,
          role: l.user.role,
        }
      : null,
    metadata: sanitizeMetadata(l.metadataJson),
  }));

  // Client-side search filtering if search term provided
  let filtered = logs;
  if (search) {
    const q = search.toLowerCase();
    filtered = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.entity.toLowerCase().includes(q) ||
        l.user?.name?.toLowerCase().includes(q) ||
        l.user?.email?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    ok: true,
    logs: filtered,
    total: filtered.length,
  });
}
