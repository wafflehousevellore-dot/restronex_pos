import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";
import { appCache, getOrSetCache } from "@/lib/cache";
import { deleteTenantFile, STORAGE_BUCKETS } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauth" }, { status: 401 });
  const tenantId = await resolveTenantId(userId, req.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });
  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await getOrSetCache(
    `menu_api_${tenantId}`,
    async () => {
      const [categories, items] = await Promise.all([
        prisma.menuCategory.findMany({
          where: { tenantId },
          include: { items: true },
          orderBy: { sortOrder: "asc" },
        }),
        prisma.menuItem.findMany({
          where: { tenantId },
          include: {
            variants: true,
            modifiers: true,
            category: true,
            addonLinks: {
              where: { isActive: true },
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
          },
          orderBy: { name: "asc" },
        }),
      ]);
      return { categories, items, cats: categories };
    },
    30
  );

  const res = NextResponse.json(data);
  res.headers.set("Cache-Control", "private, s-maxage=15, stale-while-revalidate=45");
  return res;
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauth" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Invalidate caches
  appCache.del(`menu_api_${tenantId}`);
  appCache.del(`qr_menu_${tenantId}`);

  if (body.type === "category") {
    const cat = await prisma.menuCategory.create({
      data: {
        tenantId,
        name: body.name,
        slug:
          body.slug ||
          body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).slice(2, 4),
        sortOrder: body.sortOrder || 0,
      },
    });
    return NextResponse.json(cat);
  }

  if (body.type === "item") {
    const item = await prisma.menuItem.create({
      data: {
        tenantId,
        categoryId: body.categoryId,
        name: body.name,
        pricePaise: body.pricePaise,
        isVeg: body.isVeg ?? true,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        isSoldOut: body.isSoldOut ?? false,
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
    return NextResponse.json(item);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauth" }, { status: 401 });
  const body = await req.json();
  const tenantId = await resolveTenantId(userId, body.tenantId);
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  const mem = await prisma.membership.findFirst({ where: { userId, tenantId } });
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!body.id) {
    return NextResponse.json({ error: "Item ID required" }, { status: 400 });
  }

  const existingItem = await prisma.menuItem.findFirst({
    where: { id: body.id, tenantId },
  });
  if (!existingItem) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }

  // If image changed or was removed, cleanup old image from storage
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
      name: body.name !== undefined ? body.name : existingItem.name,
      pricePaise: body.pricePaise !== undefined ? body.pricePaise : existingItem.pricePaise,
      categoryId: body.categoryId !== undefined ? body.categoryId : existingItem.categoryId,
      isVeg: body.isVeg !== undefined ? body.isVeg : existingItem.isVeg,
      description: body.description !== undefined ? body.description : existingItem.description,
      imageUrl: body.imageUrl !== undefined ? body.imageUrl : existingItem.imageUrl,
      isSoldOut: body.isSoldOut !== undefined ? body.isSoldOut : existingItem.isSoldOut,
      isActive: body.isActive !== undefined ? body.isActive : existingItem.isActive,
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

  // Invalidate caches
  appCache.del(`menu_api_${tenantId}`);
  appCache.del(`qr_menu_${tenantId}`);

  return NextResponse.json(updatedItem);
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauth" }, { status: 401 });
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

  if (type === "category") {
    // Delete all items' images in category first
    const categoryItems = await prisma.menuItem.findMany({
      where: { categoryId: id, tenantId },
    });
    for (const it of categoryItems) {
      if (it.imageUrl) {
        try {
          await deleteTenantFile(tenantId, it.imageUrl, STORAGE_BUCKETS.PUBLIC_ASSETS);
        } catch (e: any) {
          console.warn("Image cleanup error:", e?.message);
        }
      }
    }
    await prisma.menuItem.deleteMany({ where: { categoryId: id, tenantId } });
    await prisma.menuCategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  // Delete single item
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
  return NextResponse.json({ success: true });
}
