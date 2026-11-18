import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { appCache, getOrSetCache } from "@/lib/cache";
import { deleteTenantFile, STORAGE_BUCKETS } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });
  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const outletId = req.nextUrl.searchParams.get("outletId");

  const [categories, items] = await Promise.all([
    prisma.menuCategory.findMany({
      where: { tenantId },
      include: {
        items: {
          select: { id: true, name: true, pricePaise: true, isSoldOut: true, isActive: true },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { tenantId },
      include: {
        variants: {
          orderBy: { pricePaise: "asc" },
        },
        modifiers: true,
        category: true,
        addonLinks: {
          where: {
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
        },
        recipe: {
          include: {
            ingredients: {
              include: { inventoryItem: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Compute operational menu metrics
  let totalProducts = items.length;
  let activeProducts = 0;
  let inactiveProducts = 0;
  let outOfStockProducts = 0;
  let productsWithModifiers = 0;
  let vegCount = 0;
  let nonVegCount = 0;

  items.forEach((it) => {
    if (it.isActive) activeProducts++;
    else inactiveProducts++;

    if (it.isSoldOut) outOfStockProducts++;

    if ((it.addonLinks && it.addonLinks.length > 0) || (it.modifiers && it.modifiers.length > 0)) {
      productsWithModifiers++;
    }

    if (it.isVeg) vegCount++;
    else nonVegCount++;
  });

  const metrics = {
    totalProducts,
    activeProducts,
    inactiveProducts,
    outOfStockProducts,
    productsWithModifiers,
    categoriesCount: categories.length,
    vegCount,
    nonVegCount,
  };

  return NextResponse.json({
    categories,
    items,
    cats: categories,
    metrics,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Invalidate caches
  appCache.del(`menu_api_${tenantId}`);
  appCache.del(`qr_menu_${tenantId}`);

  // 1. Create Category
  if (body.type === "category") {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const slug =
      body.slug?.trim() ||
      body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).slice(2, 5);

    const cat = await prisma.menuCategory.create({
      data: {
        tenantId,
        name: body.name.trim(),
        slug,
        sortOrder: Number(body.sortOrder) || 0,
        isActive: body.isActive ?? true,
        imageUrl: body.imageUrl || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "MENU_CATEGORY_CREATED",
        entity: "MenuCategory",
        entityId: cat.id,
        metadataJson: JSON.stringify({ name: cat.name }),
      },
    });

    return NextResponse.json(cat);
  }

  // 2. Create Menu Item
  if (body.type === "item") {
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    if (!body.categoryId) {
      return NextResponse.json({ error: "Category selection is required" }, { status: 400 });
    }
    if (typeof body.pricePaise !== "number" || body.pricePaise < 0) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    }

    // Duplicate SKU check
    if (body.sku && body.sku.trim()) {
      const existingSku = await prisma.menuItem.findFirst({
        where: { tenantId, sku: body.sku.trim() },
      });
      if (existingSku) {
        return NextResponse.json(
          { error: `SKU '${body.sku.trim()}' is already in use by '${existingSku.name}'` },
          { status: 400 }
        );
      }
    }

    const item = await prisma.menuItem.create({
      data: {
        tenantId,
        categoryId: body.categoryId,
        name: body.name.trim(),
        pricePaise: body.pricePaise,
        isVeg: body.isVeg ?? true,
        description: body.description?.trim() || null,
        imageUrl: body.imageUrl || null,
        isSoldOut: body.isSoldOut ?? false,
        isActive: body.isActive ?? true,
        sku: body.sku?.trim() || null,
        prepTimeMin: Number(body.prepTimeMin) || 10,
        taxConfigId: body.taxConfigId || null,
        ...(Array.isArray(body.variants) && body.variants.length > 0
          ? {
              variants: {
                create: body.variants.map((v: any) => ({
                  name: v.name.trim(),
                  pricePaise: Number(v.pricePaise) || 0,
                  isActive: v.isActive ?? true,
                })),
              },
            }
          : {}),
        ...(Array.isArray(body.addonGroupIds) && body.addonGroupIds.length > 0
          ? {
              addonLinks: {
                create: body.addonGroupIds.map((gId: string, idx: number) => ({
                  tenantId,
                  addonGroupId: gId,
                  sortOrder: idx,
                  isActive: true,
                })),
              },
            }
          : {}),
      },
      include: {
        category: true,
        variants: true,
        modifiers: true,
        addonLinks: {
          include: {
            addonGroup: {
              include: {
                options: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
              },
            },
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "MENU_ITEM_CREATED",
        entity: "MenuItem",
        entityId: item.id,
        metadataJson: JSON.stringify({ name: item.name, pricePaise: item.pricePaise }),
      },
    });

    return NextResponse.json(item);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Invalidate caches
  appCache.del(`menu_api_${tenantId}`);
  appCache.del(`qr_menu_${tenantId}`);

  // 1. Update Category
  if (body.type === "category") {
    if (!body.id) return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    const existingCat = await prisma.menuCategory.findFirst({ where: { id: body.id, tenantId } });
    if (!existingCat) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const updatedCat = await prisma.menuCategory.update({
      where: { id: body.id },
      data: {
        name: body.name !== undefined ? body.name.trim() : existingCat.name,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : existingCat.sortOrder,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existingCat.isActive,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : existingCat.imageUrl,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "MENU_CATEGORY_UPDATED",
        entity: "MenuCategory",
        entityId: updatedCat.id,
        metadataJson: JSON.stringify({ name: updatedCat.name }),
      },
    });

    return NextResponse.json(updatedCat);
  }

  // 2. Update Menu Item
  if (!body.id) {
    return NextResponse.json({ error: "Item ID required" }, { status: 400 });
  }

  const existingItem = await prisma.menuItem.findFirst({
    where: { id: body.id, tenantId },
  });
  if (!existingItem) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }

  // Check duplicate SKU if SKU was changed
  if (body.sku && body.sku.trim() !== existingItem.sku) {
    const existingSku = await prisma.menuItem.findFirst({
      where: { tenantId, sku: body.sku.trim(), id: { not: body.id } },
    });
    if (existingSku) {
      return NextResponse.json(
        { error: `SKU '${body.sku.trim()}' is already in use by '${existingSku.name}'` },
        { status: 400 }
      );
    }
  }

  // If image changed or removed, cleanup old image from storage
  if (
    existingItem.imageUrl &&
    body.imageUrl !== undefined &&
    existingItem.imageUrl !== body.imageUrl
  ) {
    try {
      await deleteTenantFile(tenantId, existingItem.imageUrl, STORAGE_BUCKETS.PUBLIC_ASSETS);
    } catch (err: any) {
      console.warn("Notice: Old image cleanup during item update:", err?.message);
    }
  }

  // Update variants if provided
  if (Array.isArray(body.variants)) {
    await prisma.$transaction(async (tx) => {
      await tx.menuVariant.deleteMany({ where: { itemId: body.id } });
      if (body.variants.length > 0) {
        await tx.menuVariant.createMany({
          data: body.variants.map((v: any) => ({
            itemId: body.id,
            name: v.name.trim(),
            pricePaise: Number(v.pricePaise) || 0,
            isActive: v.isActive ?? true,
          })),
        });
      }
    });
  }

  // Sync addonGroupIds if provided
  if (Array.isArray(body.addonGroupIds)) {
    await prisma.$transaction(async (tx) => {
      await tx.productAddonGroup.deleteMany({
        where: { tenantId, menuItemId: body.id },
      });
      if (body.addonGroupIds.length > 0) {
        await tx.productAddonGroup.createMany({
          data: body.addonGroupIds.map((gId: string, idx: number) => ({
            tenantId,
            menuItemId: body.id,
            addonGroupId: gId,
            sortOrder: idx,
            isActive: true,
          })),
          skipDuplicates: true,
        });
      }
    });
  }

  const updatedItem = await prisma.menuItem.update({
    where: { id: body.id },
    data: {
      name: body.name !== undefined ? body.name.trim() : existingItem.name,
      pricePaise: body.pricePaise !== undefined ? Number(body.pricePaise) : existingItem.pricePaise,
      categoryId: body.categoryId !== undefined ? body.categoryId : existingItem.categoryId,
      isVeg: body.isVeg !== undefined ? Boolean(body.isVeg) : existingItem.isVeg,
      description: body.description !== undefined ? body.description?.trim() || null : existingItem.description,
      imageUrl: body.imageUrl !== undefined ? body.imageUrl : existingItem.imageUrl,
      isSoldOut: body.isSoldOut !== undefined ? Boolean(body.isSoldOut) : existingItem.isSoldOut,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : existingItem.isActive,
      sku: body.sku !== undefined ? body.sku?.trim() || null : existingItem.sku,
      prepTimeMin: body.prepTimeMin !== undefined ? Number(body.prepTimeMin) : existingItem.prepTimeMin,
      taxConfigId: body.taxConfigId !== undefined ? body.taxConfigId : existingItem.taxConfigId,
    },
    include: {
      category: true,
      variants: true,
      modifiers: true,
      addonLinks: {
        include: {
          addonGroup: {
            include: {
              options: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "MENU_ITEM_UPDATED",
      entity: "MenuItem",
      entityId: updatedItem.id,
      metadataJson: JSON.stringify({ name: updatedItem.name, pricePaise: updatedItem.pricePaise }),
    },
  });

  return NextResponse.json(updatedItem);
}

// Bulk Actions & Operations (Section 8)
export async function PATCH(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action, itemIds, itemId } = body;

  // Invalidate caches
  appCache.del(`menu_api_${tenantId}`);
  appCache.del(`qr_menu_${tenantId}`);

  // 1. Bulk Stock Update (In-Stock / Out-of-Stock)
  if (action === "bulk_stock") {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: "itemIds array required" }, { status: 400 });
    }
    const isSoldOut = Boolean(body.isSoldOut);
    await prisma.menuItem.updateMany({
      where: { id: { in: itemIds }, tenantId },
      data: { isSoldOut },
    });
    return NextResponse.json({ success: true, count: itemIds.length });
  }

  // 2. Bulk Active Status Update
  if (action === "bulk_active") {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: "itemIds array required" }, { status: 400 });
    }
    const isActive = Boolean(body.isActive);
    await prisma.menuItem.updateMany({
      where: { id: { in: itemIds }, tenantId },
      data: { isActive },
    });
    return NextResponse.json({ success: true, count: itemIds.length });
  }

  // 3. Bulk Category Reassignment
  if (action === "bulk_category") {
    if (!Array.isArray(itemIds) || itemIds.length === 0 || !body.categoryId) {
      return NextResponse.json({ error: "itemIds and categoryId required" }, { status: 400 });
    }
    await prisma.menuItem.updateMany({
      where: { id: { in: itemIds }, tenantId },
      data: { categoryId: body.categoryId },
    });
    return NextResponse.json({ success: true, count: itemIds.length });
  }

  // 4. Bulk Price Adjustment (% or Flat Amount)
  if (action === "bulk_price") {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: "itemIds array required" }, { status: 400 });
    }
    const pct = Number(body.percentageChange) || 0;
    const flatPaise = Number(body.flatAmountPaise) || 0;

    const items = await prisma.menuItem.findMany({
      where: { id: { in: itemIds }, tenantId },
    });

    await prisma.$transaction(
      items.map((it) => {
        let newPrice = it.pricePaise;
        if (pct !== 0) {
          newPrice = Math.round(newPrice * (1 + pct / 100));
        }
        if (flatPaise !== 0) {
          newPrice = Math.max(0, newPrice + flatPaise);
        }
        return prisma.menuItem.update({
          where: { id: it.id },
          data: { pricePaise: newPrice },
        });
      })
    );

    return NextResponse.json({ success: true, count: items.length });
  }

  // 5. Duplicate Item
  if (action === "duplicate_item") {
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });
    const original = await prisma.menuItem.findFirst({
      where: { id: itemId, tenantId },
      include: {
        variants: true,
        addonLinks: true,
      },
    });
    if (!original) return NextResponse.json({ error: "Original item not found" }, { status: 404 });

    const duplicate = await prisma.menuItem.create({
      data: {
        tenantId,
        categoryId: original.categoryId,
        name: `${original.name} (Copy)`,
        pricePaise: original.pricePaise,
        isVeg: original.isVeg,
        description: original.description,
        imageUrl: original.imageUrl,
        isSoldOut: false,
        isActive: true,
        prepTimeMin: original.prepTimeMin,
        sku: original.sku ? `${original.sku}-COPY-${Math.random().toString(36).slice(2, 5)}` : null,
        variants: {
          create: original.variants.map((v) => ({
            name: v.name,
            pricePaise: v.pricePaise,
            isActive: v.isActive,
          })),
        },
        addonLinks: {
          create: original.addonLinks.map((al) => ({
            tenantId,
            addonGroupId: al.addonGroupId,
            sortOrder: al.sortOrder,
            isActive: true,
          })),
        },
      },
      include: {
        category: true,
        variants: true,
        addonLinks: {
          include: {
            addonGroup: {
              include: {
                options: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, item: duplicate });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "item";
  const tenantId = await resolveTenantId(userId, searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  // Invalidate caches
  appCache.del(`menu_api_${tenantId}`);
  appCache.del(`qr_menu_${tenantId}`);

  // 1. Delete Category with Dependency Protection (Section 3)
  if (type === "category") {
    const productCount = await prisma.menuItem.count({
      where: { categoryId: id, tenantId },
    });

    if (productCount > 0) {
      const reassignToCategoryId = searchParams.get("reassignToCategoryId");
      if (reassignToCategoryId) {
        // Safe reassignment of products
        await prisma.menuItem.updateMany({
          where: { categoryId: id, tenantId },
          data: { categoryId: reassignToCategoryId },
        });
      } else {
        return NextResponse.json(
          {
            error: `Cannot delete category: ${productCount} products are assigned to it. Reassign or delete the products first.`,
            productCount,
          },
          { status: 409 }
        );
      }
    }

    const cat = await prisma.menuCategory.findFirst({ where: { id, tenantId } });
    if (cat?.imageUrl) {
      try {
        await deleteTenantFile(tenantId, cat.imageUrl, STORAGE_BUCKETS.PUBLIC_ASSETS);
      } catch {}
    }

    await prisma.menuCategory.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "MENU_CATEGORY_DELETED",
        entity: "MenuCategory",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  }

  // 2. Delete Single Item
  const existingItem = await prisma.menuItem.findFirst({
    where: { id, tenantId },
  });
  if (!existingItem) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (existingItem.imageUrl) {
    try {
      await deleteTenantFile(tenantId, existingItem.imageUrl, STORAGE_BUCKETS.PUBLIC_ASSETS);
    } catch (err: any) {
      console.warn("Notice: Old image cleanup during item deletion:", err?.message);
    }
  }

  await prisma.menuItem.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "MENU_ITEM_DELETED",
      entity: "MenuItem",
      entityId: id,
      metadataJson: JSON.stringify({ name: existingItem.name }),
    },
  });

  return NextResponse.json({ success: true });
}
