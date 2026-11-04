import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId, user } = await getSession();
  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { step } = body as { step: number };
  if (!step || step < 1 || step > 8) {
    return NextResponse.json({ error: "Invalid step number (1-8)" }, { status: 400 });
  }

  let tenantId = await resolveTenantId(userId);

  // STEP 1: Business Information
  if (step === 1) {
    const { name, businessType, phone, email } = body;
    if (!name || !businessType) {
      return NextResponse.json({ error: "Business name and restaurant type are required" }, { status: 400 });
    }

    if (!tenantId) {
      const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);
      const tenant = await prisma.tenant.create({
        data: {
          name,
          slug,
          businessType,
          email: email || user.email,
          phone: phone || "+91 90000 00000",
          country: "IN",
          timeZone: "Asia/Kolkata",
          currency: "INR",
          onboardingStep: 1,
        },
      });
      await prisma.membership.create({
        data: { userId, tenantId: tenant.id, role: "OWNER" },
      });
      await prisma.restaurantSetting.create({
        data: { tenantId: tenant.id, receiptHeader: tenant.name },
      });
      tenantId = tenant.id;
    } else {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          name,
          businessType,
          email: email || user.email,
          phone: phone || "+91 90000 00000",
          onboardingStep: Math.max(1, body.currentStep || 1),
        },
      });
    }

    return NextResponse.json({ ok: true, step: 1, tenantId, nextStep: 2 });
  }

  if (!tenantId) {
    return NextResponse.json({ error: "Complete Step 1 to initialize your restaurant" }, { status: 400 });
  }

  // STEP 2: Business Address
  if (step === 2) {
    const { address, city, state, pincode, country = "IN" } = body;
    if (!address || !city) {
      return NextResponse.json({ error: "Address and city are required" }, { status: 400 });
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        address,
        city,
        state: state || null,
        pincode: pincode || null,
        country,
        onboardingStep: Math.max(2, body.currentStep || 2),
      },
    });

    return NextResponse.json({ ok: true, step: 2, nextStep: 3 });
  }

  // STEP 3: Outlet Setup
  if (step === 3) {
    const { outletName, outletAddress, outletCity, outletPhone, serviceModes, openingHours } = body;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const finalName = outletName || `${tenant.name} — Main Branch`;
    const finalAddress = outletAddress || tenant.address || "Main Street";
    const finalCity = outletCity || tenant.city || "Bengaluru";
    const finalPhone = outletPhone || tenant.phone;
    const finalModes = Array.isArray(serviceModes)
      ? serviceModes.join(",")
      : serviceModes || "DINE_IN,TAKEAWAY,DELIVERY";

    const existingOutlet = await prisma.outlet.findFirst({ where: { tenantId } });
    let outletId = existingOutlet?.id;

    if (existingOutlet) {
      await prisma.outlet.update({
        where: { id: existingOutlet.id },
        data: {
          name: finalName,
          address: finalAddress,
          city: finalCity,
          phone: finalPhone,
          serviceModes: finalModes,
          openingHours: openingHours || "10:00 AM - 11:00 PM",
        },
      });
    } else {
      const slug = "outlet-" + Math.random().toString(36).slice(2, 8);
      const newOutlet = await prisma.outlet.create({
        data: {
          tenantId,
          name: finalName,
          slug,
          address: finalAddress,
          city: finalCity,
          phone: finalPhone,
          serviceModes: finalModes,
          openingHours: openingHours || "10:00 AM - 11:00 PM",
        },
      });
      outletId = newOutlet.id;
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingStep: Math.max(3, body.currentStep || 3) },
    });

    return NextResponse.json({ ok: true, step: 3, outletId, nextStep: 4 });
  }

  // STEP 4: Tax and Billing Settings
  if (step === 4) {
    const { gstNumber, fssaiNumber, receiptHeader, receiptFooter, serviceChargePct, cgstRate = 900, sgstRate = 900 } = body;

    await prisma.restaurantSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        gstNumber: gstNumber || null,
        fssaiNumber: fssaiNumber || null,
        receiptHeader: receiptHeader || null,
        receiptFooter: receiptFooter || "Thank you for dining with us!",
        serviceChargePct: Number(serviceChargePct) || 0,
      },
      update: {
        gstNumber: gstNumber || null,
        fssaiNumber: fssaiNumber || null,
        receiptHeader: receiptHeader || null,
        receiptFooter: receiptFooter || "Thank you for dining with us!",
        serviceChargePct: Number(serviceChargePct) || 0,
      },
    });

    // Update or create CGST & SGST configs
    await prisma.taxConfig.deleteMany({ where: { tenantId } });
    await prisma.taxConfig.createMany({
      data: [
        { tenantId, name: "CGST", rateBps: Number(cgstRate) || 900 },
        { tenantId, name: "SGST", rateBps: Number(sgstRate) || 900 },
      ],
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingStep: Math.max(4, body.currentStep || 4) },
    });

    return NextResponse.json({ ok: true, step: 4, nextStep: 5 });
  }

  // STEP 5: Menu Setup
  if (step === 5) {
    const { categories } = body;
    if (Array.isArray(categories) && categories.length > 0) {
      for (const cat of categories) {
        if (!cat.name) continue;
        const slug = slugify(cat.name) + "-" + Math.random().toString(36).slice(2, 6);
        const createdCat = await prisma.menuCategory.create({
          data: {
            tenantId,
            name: cat.name,
            slug,
            sortOrder: 0,
          },
        });

        if (Array.isArray(cat.items) && cat.items.length > 0) {
          await prisma.menuItem.createMany({
            data: cat.items.map((it: any) => ({
              tenantId,
              categoryId: createdCat.id,
              name: it.name || "Special Dish",
              pricePaise: Math.round((Number(it.price) || 199) * 100),
              isVeg: it.isVeg !== false,
              description: it.description || null,
            })),
          });
        }
      }
    } else {
      // Seed default menu if none provided
      const existingCats = await prisma.menuCategory.findMany({ where: { tenantId } });
      if (existingCats.length === 0) {
        const c1 = await prisma.menuCategory.create({
          data: { tenantId, name: "Signature Dishes", slug: "sig-" + Math.random().toString(36).slice(2, 6) },
        });
        const c2 = await prisma.menuCategory.create({
          data: { tenantId, name: "Beverages", slug: "bev-" + Math.random().toString(36).slice(2, 6) },
        });
        await prisma.menuItem.createMany({
          data: [
            { tenantId, categoryId: c1.id, name: "Chef's Special Pizza", pricePaise: 34900, isVeg: true, description: "Fresh mozzarella, basil, hand-tossed" },
            { tenantId, categoryId: c1.id, name: "Grilled Herb Sandwich", pricePaise: 21900, isVeg: true, description: "Crispy grilled sourdough with herbs" },
            { tenantId, categoryId: c2.id, name: "Artisan Cold Brew", pricePaise: 16900, isVeg: true, description: "Steeped for 18 hours" },
            { tenantId, categoryId: c2.id, name: "Fresh Mint Lemonade", pricePaise: 11900, isVeg: true, description: "Fresh lime, mint leaves, crushed ice" },
          ],
        });
      }
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingStep: Math.max(5, body.currentStep || 5) },
    });

    return NextResponse.json({ ok: true, step: 5, nextStep: 6 });
  }

  // STEP 6: Staff Setup
  if (step === 6) {
    const { staffList } = body;
    if (Array.isArray(staffList) && staffList.length > 0) {
      for (const st of staffList) {
        if (!st.email) continue;
        let staffUser = await prisma.user.findUnique({ where: { email: st.email } });
        if (!staffUser) {
          staffUser = await prisma.user.create({
            data: {
              email: st.email,
              name: st.name || st.email.split("@")[0],
              role: st.role || "CASHIER",
            },
          });
        }
        await prisma.membership.upsert({
          where: { userId_tenantId: { userId: staffUser.id, tenantId } },
          create: {
            userId: staffUser.id,
            tenantId,
            role: st.role || "CASHIER",
          },
          update: { role: st.role || "CASHIER" },
        });
      }
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingStep: Math.max(6, body.currentStep || 6) },
    });

    return NextResponse.json({ ok: true, step: 6, nextStep: 7 });
  }

  // STEP 7: Hardware and Operational Settings
  if (step === 7) {
    const { printerName, paperWidth = 80, enableKOT = true, tableCount = 10, areaName = "Main Hall" } = body;
    const outlet = await prisma.outlet.findFirst({ where: { tenantId } });

    if (printerName && outlet) {
      const pWidthStr = typeof paperWidth === "string" ? paperWidth : `${Number(paperWidth) || 80}mm`;
      await prisma.printerDevice.upsert({
        where: { id: `prn_${tenantId}_main` },
        create: {
          id: `prn_${tenantId}_main`,
          tenantId,
          outletId: outlet.id,
          name: printerName,
          type: "USB_THERMAL",
          paperWidth: pWidthStr,
          isDefaultBilling: true,
        },
        update: {
          name: printerName,
          paperWidth: pWidthStr,
        },
      });
    }

    // Seed tables if none exist
    const count = Math.max(1, Math.min(50, Number(tableCount) || 10));
    const existingTables = await prisma.table.count({ where: { tenantId } });
    if (existingTables === 0 && outlet) {
      for (let i = 1; i <= count; i++) {
        await prisma.table.create({
          data: {
            tenantId,
            outletId: outlet.id,
            number: `T${String(i).padStart(2, "0")}`,
            area: i <= 6 ? areaName : "AC Section",
            capacity: [2, 4, 4, 6][i % 4],
            status: "AVAILABLE",
          },
        });
      }
    }

    await prisma.restaurantSetting.upsert({
      where: { tenantId },
      create: { tenantId, enableKOT: Boolean(enableKOT) },
      update: { enableKOT: Boolean(enableKOT) },
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { onboardingStep: Math.max(7, body.currentStep || 7) },
    });

    return NextResponse.json({ ok: true, step: 7, nextStep: 8 });
  }

  // STEP 8: Final Review & Confirmation
  if (step === 8) {
    // Validate mandatory criteria
    const [tenant, outletCount, catCount, itemCount, tableCount] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.outlet.count({ where: { tenantId } }),
      prisma.menuCategory.count({ where: { tenantId } }),
      prisma.menuItem.count({ where: { tenantId } }),
      prisma.table.count({ where: { tenantId } }),
    ]);

    if (!tenant?.name) {
      return NextResponse.json({ error: "Missing restaurant name in Step 1" }, { status: 400 });
    }
    if (outletCount === 0) {
      return NextResponse.json({ error: "Please configure at least one outlet in Step 3" }, { status: 400 });
    }
    if (catCount === 0 || itemCount === 0) {
      return NextResponse.json({ error: "Please add at least one menu category and item in Step 5" }, { status: 400 });
    }

    // Mark onboarding complete!
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        onboardingStep: 7,
        onboardingComplete: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "ONBOARDING_COMPLETED",
        entity: "Tenant",
        entityId: tenantId,
        metadataJson: JSON.stringify({ completedAt: new Date() }),
      },
    });

    return NextResponse.json({
      ok: true,
      step: 8,
      onboardingComplete: true,
      redirectTo: "/app/pos",
      message: `Congratulations! ${updated.name} is now live and ready for POS service.`,
    });
  }

  return NextResponse.json({ error: "Unhandled step" }, { status: 400 });
}
