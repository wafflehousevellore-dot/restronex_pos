import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const pendingRegistrationSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  restaurantType: z.string().default("Restaurant"),
  planSlug: z.enum(["starter", "growth", "business"]).default("starter"),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).default("MONTHLY"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = pendingRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { businessName, ownerName, email, phone, restaurantType, planSlug, billingCycle } = parsed.data;

    // Check if an existing pending registration exists for this email
    let reg = await prisma.pendingRegistration.findFirst({
      where: { email, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (reg) {
      reg = await prisma.pendingRegistration.update({
        where: { id: reg.id },
        data: {
          businessName,
          ownerName,
          phone,
          restaurantType,
          planSlug,
          billingCycle,
        },
      });
    } else {
      reg = await prisma.pendingRegistration.create({
        data: {
          businessName,
          ownerName,
          email,
          phone,
          restaurantType,
          planSlug,
          billingCycle,
          status: "PENDING",
        },
      });
    }

    const nextUrl = `/sign-up?pendingId=${reg.id}&plan=${planSlug}&cycle=${billingCycle}&next=${encodeURIComponent(
      `/checkout?pendingId=${reg.id}&plan=${planSlug}&cycle=${billingCycle}`
    )}`;

    const res = NextResponse.json({
      ok: true,
      pendingId: reg.id,
      next: nextUrl,
    });

    // Store cookies for persistence across sessions
    res.cookies.set("restronex_pending_id", reg.id, { path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" });
    res.cookies.set("restronex_plan", planSlug, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
    res.cookies.set("restronex_cycle", billingCycle, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save registration" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const pendingId = req.nextUrl.searchParams.get("id") || req.nextUrl.searchParams.get("pendingId");
  const email = req.nextUrl.searchParams.get("email");

  if (!pendingId && !email) {
    return NextResponse.json({ error: "Missing id or email" }, { status: 400 });
  }

  const reg = await prisma.pendingRegistration.findFirst({
    where: {
      OR: [
        ...(pendingId ? [{ id: pendingId }] : []),
        ...(email ? [{ email }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!reg) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  return NextResponse.json({ reg });
}
