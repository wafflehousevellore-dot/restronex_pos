import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Strips sensitive keys (passwords, tokens, secrets, card details) from metadata.
 */
function sanitizeMetadata(metadataJson: string | null): any {
  if (!metadataJson) return null;
  try {
    const parsed = JSON.parse(metadataJson);
    if (typeof parsed !== "object" || parsed === null) return parsed;
    const sanitized = { ...parsed };

    const sensitivePatterns = [
      "password",
      "token",
      "secret",
      "authorization",
      "apikey",
      "key",
      "card",
      "cvv",
      "pin",
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitivePatterns.some((pattern) => key.toLowerCase().includes(pattern))) {
        sanitized[key] = "••••••••";
      }
    }
    return sanitized;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Organization context required" }, { status: 400 });

  const memCheck = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!memCheck) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase() || "";
  const actionParam = req.nextUrl.searchParams.get("action")?.trim() || "";
  const entityParam = req.nextUrl.searchParams.get("entity")?.trim() || "";
  const limit = Math.max(1, Math.min(200, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10)));
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") || "0", 10));

  const where: any = {
    tenantId,
    ...(actionParam && actionParam !== "ALL" ? { action: actionParam } : {}),
    ...(entityParam && entityParam !== "ALL" ? { entity: entityParam } : {}),
  };

  const [totalCount, rawLogs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  let logs = rawLogs.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    metadata: sanitizeMetadata(log.metadataJson),
    createdAt: log.createdAt.toISOString(),
    actor: log.user
      ? {
          id: log.user.id,
          name: log.user.name,
          email: log.user.email,
          role: log.user.role,
        }
      : {
          id: "system",
          name: "System / Gateway",
          email: "automated@restronex.com",
          role: "AUTOMATION",
        },
  }));

  if (search) {
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(search) ||
        l.entity.toLowerCase().includes(search) ||
        (l.entityId && l.entityId.toLowerCase().includes(search)) ||
        l.actor.name.toLowerCase().includes(search) ||
        l.actor.email.toLowerCase().includes(search)
    );
  }

  return NextResponse.json({
    totalCount,
    limit,
    offset,
    logs,
  });
}
