import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { appCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await getSession();
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const tenantId = await resolveTenantId(userId, searchParams.get("tenantId"));
    if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

    const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
    if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const menuItemId = searchParams.get("menuItemId");
    const outletId = searchParams.get("outletId");

    const groups = await prisma.addonGroup.findMany({
      where: { tenantId, isActive: true },
      include: {
        options: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    let assignedGroupIds: string[] = [];
    let productLinks: any[] = [];

    if (menuItemId) {
      productLinks = await prisma.productAddonGroup.findMany({
        where: {
          tenantId,
          menuItemId,
          isActive: true,
          OR: [{ outletId: null }, ...(outletId ? [{ outletId }] : [])],
        },
        include: {
          addonGroup: {
            include: {
              options: {
                where: { isActive: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      });
      assignedGroupIds = productLinks.map((l) => l.addonGroupId);
    }

    return NextResponse.json({
      ok: true,
      groups,
      assignedGroupIds,
      productLinks,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch addons" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getSession();
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json();
    const tenantId = await resolveTenantId(userId, body.tenantId);
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

    const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
    if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const action = body.action || "create_group";

    // Invalidate caches
    appCache.del(`menu_api_${tenantId}`);
    appCache.del(`qr_menu_${tenantId}`);

    // 1. Sync all assigned groups for a product
    if (action === "set_product_groups") {
      const { menuItemId, addonGroupIds, outletId } = body;
      if (!menuItemId || !Array.isArray(addonGroupIds)) {
        return NextResponse.json({ error: "menuItemId and addonGroupIds array required" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // Remove existing links for this product
        await tx.productAddonGroup.deleteMany({
          where: {
            tenantId,
            menuItemId,
            outletId: outletId || null,
          },
        });

        // Add new links
        if (addonGroupIds.length > 0) {
          await tx.productAddonGroup.createMany({
            data: addonGroupIds.map((groupId: string, idx: number) => ({
              tenantId,
              menuItemId,
              addonGroupId: groupId,
              outletId: outletId || null,
              sortOrder: idx,
              isActive: true,
            })),
            skipDuplicates: true,
          });
        }
      });

      return NextResponse.json({ ok: true, message: "Product add-on groups updated successfully" });
    }

    // 2. Link a single group to a product
    if (action === "link_product") {
      const { menuItemId, addonGroupId, outletId } = body;
      if (!menuItemId || !addonGroupId) {
        return NextResponse.json({ error: "menuItemId and addonGroupId required" }, { status: 400 });
      }

      const link = await prisma.productAddonGroup.upsert({
        where: {
          menuItemId_addonGroupId_outletId: {
            menuItemId,
            addonGroupId,
            outletId: outletId || null,
          },
        },
        create: {
          tenantId,
          menuItemId,
          addonGroupId,
          outletId: outletId || null,
          isActive: true,
        },
        update: {
          isActive: true,
        },
      });

      return NextResponse.json({ ok: true, link });
    }

    // 3. Unlink a group from a product
    if (action === "unlink_product") {
      const { menuItemId, addonGroupId, outletId } = body;
      await prisma.productAddonGroup.deleteMany({
        where: {
          tenantId,
          menuItemId,
          addonGroupId,
          outletId: outletId || null,
        },
      });
      return NextResponse.json({ ok: true });
    }

    // 4. Create a new AddonGroup with optional nested options and optional product link
    if (action === "create_group") {
      const {
        name,
        description,
        selectionType = "MULTIPLE",
        minSelections = 0,
        maxSelections = null,
        isRequired = false,
        options = [],
        menuItemId,
        outletId,
      } = body;

      if (!name?.trim()) {
        return NextResponse.json({ error: "Add-on group name is required" }, { status: 400 });
      }

      const group = await prisma.$transaction(async (tx) => {
        const createdGroup = await tx.addonGroup.create({
          data: {
            tenantId,
            name: name.trim(),
            description: description?.trim() || null,
            selectionType: selectionType === "SINGLE" ? "SINGLE" : "MULTIPLE",
            minSelections: Number(minSelections) || 0,
            maxSelections: maxSelections ? Number(maxSelections) : null,
            isRequired: Boolean(isRequired),
            isActive: true,
            options: {
              create: (options || []).map((opt: any, idx: number) => ({
                tenantId,
                name: opt.name.trim(),
                pricePaise: Math.max(0, Math.round(Number(opt.pricePaise ?? opt.price * 100) || 0)),
                isDefault: Boolean(opt.isDefault),
                isActive: opt.isActive !== false,
                sortOrder: idx,
              })),
            },
          },
          include: {
            options: true,
          },
        });

        // If menuItemId provided, immediately associate
        if (menuItemId) {
          await tx.productAddonGroup.create({
            data: {
              tenantId,
              menuItemId,
              addonGroupId: createdGroup.id,
              outletId: outletId || null,
              isActive: true,
            },
          });
        }

        return createdGroup;
      });

      return NextResponse.json({ ok: true, group });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Operation failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await getSession();
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json();
    const tenantId = await resolveTenantId(userId, body.tenantId);
    if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

    const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
    if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, name, description, selectionType, minSelections, maxSelections, isRequired, isActive, options } = body;
    if (!id) return NextResponse.json({ error: "Group ID required" }, { status: 400 });

    const existingGroup = await prisma.addonGroup.findFirst({
      where: { id, tenantId },
      include: { options: true },
    });
    if (!existingGroup) return NextResponse.json({ error: "Add-on group not found" }, { status: 404 });

    // Invalidate caches
    appCache.del(`menu_api_${tenantId}`);
    appCache.del(`qr_menu_${tenantId}`);

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Group details
      const g = await tx.addonGroup.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : existingGroup.name,
          description: description !== undefined ? description?.trim() || null : existingGroup.description,
          selectionType: selectionType !== undefined ? selectionType : existingGroup.selectionType,
          minSelections: minSelections !== undefined ? Number(minSelections) : existingGroup.minSelections,
          maxSelections: maxSelections !== undefined ? (maxSelections ? Number(maxSelections) : null) : existingGroup.maxSelections,
          isRequired: isRequired !== undefined ? Boolean(isRequired) : existingGroup.isRequired,
          isActive: isActive !== undefined ? Boolean(isActive) : existingGroup.isActive,
        },
      });

      // 2. Update / create / delete options if provided
      if (Array.isArray(options)) {
        for (let idx = 0; idx < options.length; idx++) {
          const opt = options[idx];
          if (opt.delete && opt.id) {
            await tx.addonOption.delete({ where: { id: opt.id } });
          } else if (opt.id) {
            await tx.addonOption.update({
              where: { id: opt.id },
              data: {
                name: opt.name?.trim() || undefined,
                pricePaise: opt.pricePaise !== undefined
                  ? Math.max(0, Math.round(Number(opt.pricePaise)))
                  : opt.price !== undefined
                  ? Math.max(0, Math.round(Number(opt.price * 100)))
                  : undefined,
                isDefault: opt.isDefault !== undefined ? Boolean(opt.isDefault) : undefined,
                isActive: opt.isActive !== undefined ? Boolean(opt.isActive) : undefined,
                sortOrder: idx,
              },
            });
          } else if (opt.name?.trim()) {
            await tx.addonOption.create({
              data: {
                tenantId,
                addonGroupId: id,
                name: opt.name.trim(),
                pricePaise: Math.max(0, Math.round(Number(opt.pricePaise ?? opt.price * 100) || 0)),
                isDefault: Boolean(opt.isDefault),
                isActive: opt.isActive !== false,
                sortOrder: idx,
              },
            });
          }
        }
      }

      return tx.addonGroup.findUnique({
        where: { id },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      });
    });

    return NextResponse.json({ ok: true, group: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await getSession();
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const tenantId = await resolveTenantId(userId, searchParams.get("tenantId"));
    if (!tenantId || !id) return NextResponse.json({ error: "id and tenantId required" }, { status: 400 });

    const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
    if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Safe soft delete to preserve historical receipts and orders
    await prisma.addonGroup.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate caches
    appCache.del(`menu_api_${tenantId}`);
    appCache.del(`qr_menu_${tenantId}`);

    return NextResponse.json({ ok: true, message: "Add-on group archived safely" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Delete failed" }, { status: 500 });
  }
}
