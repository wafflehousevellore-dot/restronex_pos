import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, resolveTenantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { userId } = await getSession();
  if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const menuItemId = url.searchParams.get("menuItemId");

  if (!menuItemId) {
    const tenantId = await resolveTenantId(userId);
    if (!tenantId) return NextResponse.json({ error: "Tenant required" }, { status: 400 });
    const recipes = await prisma.recipe.findMany({
      where: { menuItem: { tenantId } },
      include: {
        menuItem: { select: { id: true, name: true, pricePaise: true } },
        ingredients: {
          include: {
            inventoryItem: { select: { id: true, name: true, unit: true, currentStock: true } },
          },
        },
      },
    });
    return NextResponse.json(recipes);
  }

  const recipe = await prisma.recipe.findUnique({
    where: { menuItemId },
    include: {
      menuItem: { select: { id: true, name: true, pricePaise: true } },
      ingredients: {
        include: {
          inventoryItem: { select: { id: true, name: true, unit: true, currentStock: true } },
        },
      },
    },
  });

  return NextResponse.json(recipe || null);
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
      menuItem: { select: { id: true, name: true } },
      ingredients: {
        include: {
          inventoryItem: { select: { id: true, name: true, unit: true, currentStock: true } },
        },
      },
    },
  });

  return NextResponse.json(updated);
}
