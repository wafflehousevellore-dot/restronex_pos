import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

  const code = req.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Barcode or SKU query required" }, { status: 400 });
  }

  try {
    // 1. Exact match on barcode or sku
    let item = await prisma.inventoryItem.findFirst({
      where: {
        tenantId,
        OR: [{ barcode: code }, { sku: code }],
      },
      include: {
        supplier: { select: { id: true, name: true } },
      },
    });

    // 2. Fallback to name search if no exact barcode match
    if (!item) {
      item = await prisma.inventoryItem.findFirst({
        where: {
          tenantId,
          name: { equals: code, mode: "insensitive" },
        },
        include: {
          supplier: { select: { id: true, name: true } },
        },
      });
    }

    if (!item) {
      return NextResponse.json({ found: false, code }, { status: 404 });
    }

    return NextResponse.json({
      found: true,
      item,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Lookup failed" }, { status: 500 });
  }
}
