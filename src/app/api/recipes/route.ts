import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const menuItemId = url.searchParams.get("menuItemId");

  if (!menuItemId) {
    const tenantId = await resolveTenantId(userId, url.searchParams.get("tenantId"));
    if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });

    const recipes = await prisma.recipe.findMany({
      where: { menuItem: { tenantId } },
      include: {
        menuItem: { select: { id: true, name: true, pricePaise: true, sku: true } },
        ingredients: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, unit: true, currentStock: true, costPerUnitPaise: true },
            },
          },
        },
      },
    });

    const enriched = recipes.map((r) => {
      let recipeCostPaise = 0;
      r.ingredients.forEach((ing) => {
        const itemCost = ing.inventoryItem?.costPerUnitPaise || 0;
        recipeCostPaise += Math.round(ing.quantity * itemCost);
      });

      const sellingPricePaise = r.menuItem?.pricePaise || 0;
      const foodCostPct = sellingPricePaise > 0 ? Math.round((recipeCostPaise / sellingPricePaise) * 100) : 0;
      const grossMarginPct = Math.max(0, 100 - foodCostPct);

      return {
        ...r,
        recipeCostPaise,
        foodCostPct,
        grossMarginPct,
      };
    });

    return NextResponse.json(enriched);
  }

  const recipe = await prisma.recipe.findUnique({
    where: { menuItemId },
    include: {
      menuItem: { select: { id: true, name: true, pricePaise: true, sku: true } },
      ingredients: {
        include: {
          inventoryItem: {
            select: { id: true, name: true, unit: true, currentStock: true, costPerUnitPaise: true },
          },
        },
      },
    },
  });

  if (!recipe) return NextResponse.json(null);

  let recipeCostPaise = 0;
  recipe.ingredients.forEach((ing) => {
    const itemCost = ing.inventoryItem?.costPerUnitPaise || 0;
    recipeCostPaise += Math.round(ing.quantity * itemCost);
  });

  const sellingPricePaise = recipe.menuItem?.pricePaise || 0;
  const foodCostPct = sellingPricePaise > 0 ? Math.round((recipeCostPaise / sellingPricePaise) * 100) : 0;
  const grossMarginPct = Math.max(0, 100 - foodCostPct);

  return NextResponse.json({
    ...recipe,
    recipeCostPaise,
    foodCostPct,
    grossMarginPct,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await req.json();
  const { menuItemId, yieldQty = 1, ingredients = [] } = body;

  if (!menuItemId) {
    return NextResponse.json({ error: "menuItemId is required" }, { status: 400 });
  }

  const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!menuItem) {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }

  const tenantId = await resolveTenantId(userId, menuItem.tenantId);
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Upsert recipe
  const recipe = await prisma.recipe.upsert({
    where: { menuItemId },
    create: {
      menuItemId,
      yieldQty: Number(yieldQty) || 1,
    },
    update: {
      yieldQty: Number(yieldQty) || 1,
    },
  });

  // Replace ingredients
  await prisma.recipeIngredient.deleteMany({
    where: { recipeId: recipe.id },
  });

  if (Array.isArray(ingredients) && ingredients.length > 0) {
    const validIngredients = ingredients
      .filter((ing: any) => ing.inventoryItemId && Number(ing.quantity) > 0)
      .map((ing: any) => ({
        recipeId: recipe.id,
        inventoryItemId: String(ing.inventoryItemId),
        quantity: Number(ing.quantity),
      }));

    if (validIngredients.length > 0) {
      await prisma.recipeIngredient.createMany({
        data: validIngredients,
      });
    }
  }

  const updated = await prisma.recipe.findUnique({
    where: { id: recipe.id },
    include: {
      menuItem: { select: { id: true, name: true, pricePaise: true } },
      ingredients: {
        include: {
          inventoryItem: {
            select: { id: true, name: true, unit: true, currentStock: true, costPerUnitPaise: true },
          },
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action: "RECIPE_UPDATED",
      entity: "Recipe",
      entityId: recipe.id,
      metadataJson: JSON.stringify({
        menuItem: menuItem.name,
        ingredientsCount: ingredients.length,
      }),
    },
  });

  return NextResponse.json({ ok: true, recipe: updated });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const recipeId = req.nextUrl.searchParams.get("recipeId");
  if (!recipeId) return NextResponse.json({ error: "recipeId required" }, { status: 400 });

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { menuItem: true },
  });
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  const memCheck = await prisma.membership.findFirst({
    where: { userId, tenantId: recipe.menuItem.tenantId },
  });
  if (!memCheck || memCheck.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.recipe.delete({ where: { id: recipeId } });
  return NextResponse.json({ ok: true, deleted: true });
}
