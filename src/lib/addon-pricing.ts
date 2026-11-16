import { prisma } from "@/lib/db";

export interface SelectedAddonInput {
  optionId: string;
  groupId?: string;
  name?: string;
  pricePaise?: number;
}

export interface CartItemValidationInput {
  menuItemId: string;
  quantity: number;
  name?: string;
  unitPricePaise?: number;
  variantName?: string;
  notes?: string;
  selectedAddons?: SelectedAddonInput[];
  modifiers?: Array<{
    name: string;
    pricePaise: number;
    optionId?: string;
    groupId?: string;
  }>;
}

export interface ValidatedItemAddon {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  pricePaise: number;
  quantity: number;
}

export interface ValidatedCartItemResult {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPricePaise: number; // Authoritative base price
  addonsPricePaise: number; // Sum of single-item add-ons
  effectiveUnitPricePaise: number; // base + addons
  lineTotalPaise: number; // effectiveUnitPricePaise * quantity
  variantName: string | null;
  notes: string | null;
  addons: ValidatedItemAddon[];
  modifiersJson: string;
}

export interface OrderValidationResult {
  ok: boolean;
  error?: string;
  items: ValidatedCartItemResult[];
  subtotalPaise: number;
}

/**
 * Authoritative Server-Side Add-on & Product Pricing Validation
 * 
 * Enforces:
 * 1. Product availability (active and not sold out)
 * 2. Multi-tenant and outlet boundaries
 * 3. Add-on group rules (required, min, max, single/multiple choice)
 * 4. Authoritative pricing from database (rejects client-tampered prices)
 * 5. Immutable snapshot generation for KDS, KOT, and invoices
 */
export async function validateAndPriceCartItems(params: {
  tenantId: string;
  outletId?: string | null;
  items: CartItemValidationInput[];
}): Promise<OrderValidationResult> {
  const { tenantId, outletId, items } = params;

  if (!items || items.length === 0) {
    return { ok: false, error: "Order must contain at least one item", items: [], subtotalPaise: 0 };
  }

  const validatedItems: ValidatedCartItemResult[] = [];
  let subtotalPaise = 0;

  // Extract unique menu item IDs
  const uniqueItemIds = Array.from(new Set(items.map((i) => i.menuItemId)));

  // Load all products with active add-on associations in single database query
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: uniqueItemIds },
      tenantId,
    },
    include: {
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
    },
  });

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  for (const item of items) {
    const product = menuItemMap.get(item.menuItemId);
    if (!product) {
      return { ok: false, error: `Product not found or unauthorized: ${item.menuItemId}`, items: [], subtotalPaise: 0 };
    }

    if (!product.isActive) {
      return { ok: false, error: `Product "${product.name}" is no longer available`, items: [], subtotalPaise: 0 };
    }

    if (product.isSoldOut) {
      return { ok: false, error: `Product "${product.name}" is currently sold out`, items: [], subtotalPaise: 0 };
    }

    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const basePricePaise = product.pricePaise;

    // Collect active add-on groups for this product
    const activeGroups = product.addonLinks
      .map((link) => link.addonGroup)
      .filter((g) => g && g.isActive);

    // Map of group options: optionId -> { option, group }
    const optionLookup = new Map<string, { option: any; group: any }>();
    for (const group of activeGroups) {
      for (const opt of group.options) {
        optionLookup.set(opt.id, { option: opt, group });
      }
    }

    // Normalize raw selected addons from client
    const rawSelections = (item.selectedAddons || item.modifiers || [])
      .map((sel: any) => {
        const optionId = sel.optionId || sel.id;
        const name = sel.name;
        return { optionId, name };
      })
      .filter((s) => Boolean(s.optionId || s.name));

    // Track selections per group
    const selectionsByGroup = new Map<string, Array<{ option: any; group: any }>>();
    for (const group of activeGroups) {
      selectionsByGroup.set(group.id, []);
    }

    const itemAddons: ValidatedItemAddon[] = [];

    for (const raw of rawSelections) {
      let matched: { option: any; group: any } | undefined;

      if (raw.optionId) {
        matched = optionLookup.get(raw.optionId);
      } else if (raw.name) {
        // Fallback: match by option name within active groups
        for (const [_, val] of optionLookup.entries()) {
          if (val.option.name.trim().toLowerCase() === raw.name.trim().toLowerCase()) {
            matched = val;
            break;
          }
        }
      }

      if (!matched) {
        // If client submitted an option that does not exist or is disabled
        return {
          ok: false,
          error: `Invalid or unavailable add-on selected for "${product.name}": ${raw.name || raw.optionId}`,
          items: [],
          subtotalPaise: 0,
        };
      }

      const { option, group } = matched;
      selectionsByGroup.get(group.id)?.push(matched);

      itemAddons.push({
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        name: option.name,
        pricePaise: option.pricePaise, // Authoritative price from DB
        quantity: 1,
      });
    }

    // Validate group constraints
    for (const group of activeGroups) {
      const selected = selectionsByGroup.get(group.id) || [];
      const count = selected.length;

      // 1. Mandatory check
      if (group.isRequired && count === 0) {
        return {
          ok: false,
          error: `Please select required add-ons for "${group.name}" on product "${product.name}"`,
          items: [],
          subtotalPaise: 0,
        };
      }

      // 2. Minimum selection count
      if (group.minSelections > 0 && count < group.minSelections) {
        return {
          ok: false,
          error: `Please select at least ${group.minSelections} option(s) for "${group.name}" on product "${product.name}"`,
          items: [],
          subtotalPaise: 0,
        };
      }

      // 3. Single select check
      if (group.selectionType === "SINGLE" && count > 1) {
        return {
          ok: false,
          error: `Only one option may be selected for "${group.name}" on product "${product.name}"`,
          items: [],
          subtotalPaise: 0,
        };
      }

      // 4. Maximum selection count
      if (group.maxSelections && count > group.maxSelections) {
        return {
          ok: false,
          error: `You can select at most ${group.maxSelections} option(s) for "${group.name}" on product "${product.name}"`,
          items: [],
          subtotalPaise: 0,
        };
      }
    }

    const addonsPricePaise = itemAddons.reduce((sum, a) => sum + a.pricePaise, 0);
    const effectiveUnitPricePaise = basePricePaise + addonsPricePaise;
    const lineTotalPaise = effectiveUnitPricePaise * quantity;

    subtotalPaise += lineTotalPaise;

    validatedItems.push({
      menuItemId: product.id,
      name: product.name,
      quantity,
      unitPricePaise: basePricePaise,
      addonsPricePaise,
      effectiveUnitPricePaise,
      lineTotalPaise,
      variantName: item.variantName || null,
      notes: item.notes || null,
      addons: itemAddons,
      modifiersJson: JSON.stringify(
        itemAddons.map((a) => ({
          groupId: a.groupId,
          groupName: a.groupName,
          optionId: a.optionId,
          name: a.name,
          pricePaise: a.pricePaise,
        }))
      ),
    });
  }

  return {
    ok: true,
    items: validatedItems,
    subtotalPaise,
  };
}
