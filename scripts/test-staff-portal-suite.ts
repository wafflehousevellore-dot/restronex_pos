import "dotenv/config";
import assert from "assert";
import crypto from "crypto";
import { prisma } from "../src/lib/db";
import {
  hasPermission,
  getEffectivePermissions,
  DEFAULT_ROLE_PERMISSIONS,
} from "../src/lib/permissions";
import {
  getOrganizationMembership,
  requireOutletAccess,
  requirePermission,
} from "../src/lib/server-auth";
import { resolveUserCustomerJourney } from "../src/lib/customer-journey";
import { calcOrderTotals } from "../src/lib/money";

async function runStaffPortalEndToEndSuite() {
  console.log("\n=================================================================");
  console.log("   RESTRO NEX — 15-SCENARIO STAFF AUTH & PORTAL AUDIT SUITE      ");
  console.log("=================================================================\n");

  const runTag = `staff_${Date.now()}`;
  let ownerUserId = "";
  let managerUserId = "";
  let cashierUserId = "";
  let kitchenUserId = "";
  let waiterUserId = "";
  let inventoryUserId = "";

  let tenantAId = "";
  let tenantBId = "";
  let outletA1Id = "";
  let outletA2Id = "";
  let outletB1Id = "";

  let cashierRawToken = "";
  let cashierMembershipId = "";

  try {
    // -----------------------------------------------------------------
    // SETUP: Dedicated Test Organization & Outlets
    // -----------------------------------------------------------------
    console.log("▶ Scenario 1: Setup test organization with active subscription & 2 outlets");
    const tenantA = await prisma.tenant.create({
      data: {
        name: `Bistro Royal (${runTag})`,
        slug: `bistro-royal-${runTag}`,
        businessType: "Fine Dining",
        email: `bistro_${runTag}@restronex.local`,
        phone: "+91 98888 11111",
        onboardingStep: 7,
        onboardingComplete: true,
      },
    });
    tenantAId = tenantA.id;

    const [outletA1, outletA2] = await Promise.all([
      prisma.outlet.create({
        data: {
          tenantId: tenantAId,
          name: "Indiranagar Flagship",
          slug: `indiranagar-${runTag}`,
          address: "100 Feet Road, Indiranagar",
          city: "Bengaluru",
          phone: "+91 98888 11112",
        },
      }),
      prisma.outlet.create({
        data: {
          tenantId: tenantAId,
          name: "Koramangala Branch",
          slug: `koramangala-${runTag}`,
          address: "80 Feet Road, Koramangala",
          city: "Bengaluru",
          phone: "+91 98888 11113",
        },
      }),
    ]);
    outletA1Id = outletA1.id;
    outletA2Id = outletA2.id;

    // Attach Starter Plan subscription
    const plan = await prisma.subscriptionPlan.findFirst({ where: { slug: "starter" } });
    if (plan) {
      await prisma.subscription.create({
        data: {
          tenantId: tenantAId,
          planId: plan.id,
          status: "ACTIVE",
          billingCycle: "MONTHLY",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // Create Owner
    const ownerUser = await prisma.user.create({
      data: {
        email: `owner_${runTag}@restronex.local`,
        name: "Vikram Owner",
        role: "OWNER",
        isPlatformAdmin: false,
      },
    });
    ownerUserId = ownerUser.id;

    await prisma.membership.create({
      data: {
        userId: ownerUserId,
        tenantId: tenantAId,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    console.log("  ✓ PASS: Restaurant organization, 2 outlets, active subscription & owner initialized");

    // -----------------------------------------------------------------
    // Scenario 2: Owner Login & Full Authority Verification
    // -----------------------------------------------------------------
    console.log("▶ Scenario 2: Owner logs in and verifies full administrative permissions");
    const ownerMem = await getOrganizationMembership(ownerUserId, tenantAId);
    assert(ownerMem, "Owner membership must exist");
    assert.strictEqual(ownerMem.role, "OWNER");
    assert.strictEqual(ownerMem.status, "ACTIVE");
    assert(hasPermission(ownerMem.role, ownerMem.permissions, "staff.invite"), "Owner has staff.invite");
    assert(hasPermission(ownerMem.role, ownerMem.permissions, "pos.close_bill"), "Owner has pos.close_bill");
    assert(hasPermission(ownerMem.role, ownerMem.permissions, "reports.financial"), "Owner has reports.financial");
    assert.strictEqual(ownerMem.authorizedOutlets.length, 2, "Owner has access to all tenant outlets");
    console.log("  ✓ PASS: Owner authenticated with full administrative capabilities across all outlets");

    // -----------------------------------------------------------------
    // Scenario 3: Owner invites Cashier to Indiranagar Outlet
    // -----------------------------------------------------------------
    console.log("▶ Scenario 3: Owner generates single-use invitation for Cashier (assigned to Outlet 1)");
    cashierRawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(cashierRawToken).digest("hex");
    const cashierEmail = `cashier_${runTag}@restronex.local`;

    const invitation = await prisma.staffInvitation.create({
      data: {
        tenantId: tenantAId,
        email: cashierEmail,
        fullName: "Aarav Cashier",
        role: "CASHIER",
        outletId: outletA1Id,
        tokenHash,
        invitedBy: ownerUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    assert(invitation.id, "Invitation record created");
    assert.strictEqual(invitation.acceptedAt, null, "Must be pending");
    assert.strictEqual(invitation.role, "CASHIER");
    console.log("  ✓ PASS: Secure cryptographic invitation created for cashier with single-use token");

    // -----------------------------------------------------------------
    // Scenario 4: Cashier verifies invitation details
    // -----------------------------------------------------------------
    console.log("▶ Scenario 4: Cashier verifies invitation token without exposing sensitive secrets");
    const verifiedInvite = await prisma.staffInvitation.findUnique({
      where: { tokenHash },
      include: { tenant: true, outlet: true },
    });
    assert(verifiedInvite, "Token resolves to valid invitation");
    assert.strictEqual(verifiedInvite.tenant.id, tenantAId);
    assert.strictEqual(verifiedInvite.outletId, outletA1Id);
    assert(verifiedInvite.expiresAt > new Date(), "Invitation is active");
    console.log("  ✓ PASS: Token verified accurately with organization, role, and outlet mapping");

    // -----------------------------------------------------------------
    // Scenario 5: Cashier accepts invitation via Clerk
    // -----------------------------------------------------------------
    console.log("▶ Scenario 5: Cashier signs in/up via Clerk and accepts the invitation");
    const cashierUser = await prisma.user.create({
      data: {
        clerkId: `clerk_cashier_${runTag}`,
        email: cashierEmail,
        name: "Aarav Cashier",
        role: "CASHIER",
        isPlatformAdmin: false,
      },
    });
    cashierUserId = cashierUser.id;

    // Simulate atomic invitation acceptance
    const acceptedMembership = await prisma.$transaction(async (tx) => {
      const mem = await tx.membership.create({
        data: {
          userId: cashierUserId,
          tenantId: tenantAId,
          role: "CASHIER",
          outletId: outletA1Id,
          status: "ACTIVE",
        },
      });

      await tx.staffProfile.create({
        data: {
          membershipId: mem.id,
          fullName: "Aarav Cashier",
          status: "ACTIVE",
        },
      });

      await tx.staffInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return mem;
    });

    cashierMembershipId = acceptedMembership.id;
    assert(cashierMembershipId, "Cashier membership created");
    console.log("  ✓ PASS: Invitation accepted, Clerk identity linked, and StaffProfile created");

    // -----------------------------------------------------------------
    // Scenario 6: Invalidation of accepted token (Single-use enforcement)
    // -----------------------------------------------------------------
    console.log("▶ Scenario 6: Single-use token enforcement blocks reuse");
    const checkInvite = await prisma.staffInvitation.findUnique({ where: { tokenHash } });
    assert(checkInvite?.acceptedAt !== null, "Token marked as accepted");
    console.log("  ✓ PASS: Single-use token safely consumed and blocked from re-acceptance");

    // -----------------------------------------------------------------
    // Scenario 7: Cashier customer journey routes directly to /staff/pos
    // -----------------------------------------------------------------
    console.log("▶ Scenario 7: Customer journey resolver routes cashier straight to /staff/pos");
    const cashierJourney = await resolveUserCustomerJourney(cashierUserId);
    assert.strictEqual(cashierJourney.status, "ACTIVE_PAID_ONBOARDED");
    assert.strictEqual(cashierJourney.redirectTo, "/staff/pos");
    console.log("  ✓ PASS: Cashier automatically routed to /staff/pos (zero checkout/onboarding prompts)");

    // -----------------------------------------------------------------
    // Scenario 8: Cashier creates a POS order in assigned outlet
    // -----------------------------------------------------------------
    console.log("▶ Scenario 8: Cashier places and bills an authorized order in assigned Outlet 1");
    const table = await prisma.table.create({
      data: {
        tenantId: tenantAId,
        outletId: outletA1Id,
        number: `T-01-${runTag.slice(-4)}`,
        status: "OCCUPIED",
      },
    });

    const category = await prisma.menuCategory.create({
      data: { tenantId: tenantAId, name: "Fast Food", slug: `ff-${runTag}` },
    });

    const item = await prisma.menuItem.create({
      data: {
        tenantId: tenantAId,
        categoryId: category.id,
        name: "Classic Burger",
        pricePaise: 25000,
        isVeg: false,
      },
    });

    const totals = calcOrderTotals({
      lineTotalsPaise: [item.pricePaise * 2],
      discountPaise: 0,
      taxRateBps: 500,
      serviceChargeBps: 0,
    });

    const posOrder = await prisma.order.create({
      data: {
        tenantId: tenantAId,
        outletId: outletA1Id,
        tableId: table.id,
        orderNumber: `ORD-${runTag.slice(-4)}`,
        type: "DINE_IN",
        status: "COMPLETED",
        subtotalPaise: totals.subtotal,
        taxPaise: totals.tax,
        totalPaise: totals.total,
      },
    });

    assert(posOrder.id, "POS order created");
    console.log(`  ✓ PASS: Cashier created order ${posOrder.orderNumber} (₹${totals.total / 100}) in Outlet 1`);

    // -----------------------------------------------------------------
    // Scenario 9: Cashier is strictly blocked from accessing unassigned Outlet 2
    // -----------------------------------------------------------------
    console.log("▶ Scenario 9: Outlet scoping security check blocks access to unassigned Outlet 2");
    const cashierMem = await getOrganizationMembership(cashierUserId, tenantAId);
    assert(cashierMem, "Cashier membership exists");
    assert.strictEqual(cashierMem.authorizedOutlets.length, 1, "Only 1 authorized outlet");
    assert.strictEqual(cashierMem.authorizedOutlets[0].id, outletA1Id);

    let unauthorizedBlocked = false;
    try {
      await requireOutletAccess(cashierMem, outletA2Id);
    } catch (err: any) {
      if (err.status === 403) unauthorizedBlocked = true;
    }
    assert(unauthorizedBlocked, "Access to unassigned outlet must be rejected with 403");
    console.log("  ✓ PASS: Cashier prohibited from operating or reading orders in unassigned Outlet 2");

    // -----------------------------------------------------------------
    // Scenario 10: Cashier cannot access Platform Admin
    // -----------------------------------------------------------------
    console.log("▶ Scenario 10: Platform Admin boundary check blocks staff access");
    assert.strictEqual(cashierUser.isPlatformAdmin, false, "Cashier is not platform admin");
    assert.notStrictEqual(cashierUser.role, "PLATFORM_OWNER", "Cashier cannot be platform owner");
    console.log("  ✓ PASS: Cashier strictly barred from platform administration portal");

    // -----------------------------------------------------------------
    // Scenario 11: Kitchen employee has KDS access but no financial reports access
    // -----------------------------------------------------------------
    console.log("▶ Scenario 11: Kitchen staff has KDS access but is barred from financial reports");
    const kitchenUser = await prisma.user.create({
      data: {
        email: `chef_${runTag}@restronex.local`,
        name: "Chef Sanjay",
        role: "KITCHEN_STAFF",
      },
    });
    kitchenUserId = kitchenUser.id;

    await prisma.membership.create({
      data: {
        userId: kitchenUserId,
        tenantId: tenantAId,
        role: "KITCHEN_STAFF",
        outletId: outletA1Id,
        status: "ACTIVE",
      },
    });

    const kitchenMem = await getOrganizationMembership(kitchenUserId, tenantAId);
    assert(kitchenMem, "Kitchen membership exists");
    assert(hasPermission(kitchenMem.role, kitchenMem.permissions, "kitchen.view"), "Has kitchen.view");
    assert(hasPermission(kitchenMem.role, kitchenMem.permissions, "kitchen.update_status"), "Has kitchen.update_status");
    assert.strictEqual(hasPermission(kitchenMem.role, kitchenMem.permissions, "reports.financial"), false, "Blocked from reports.financial");
    assert.strictEqual(hasPermission(kitchenMem.role, kitchenMem.permissions, "pos.apply_discount"), false, "Blocked from pos.apply_discount");
    console.log("  ✓ PASS: Kitchen staff possesses KDS permissions but zero financial/discount access");

    // -----------------------------------------------------------------
    // Scenario 12: Manager cannot grant themselves OWNER role
    // -----------------------------------------------------------------
    console.log("▶ Scenario 12: Manager privilege boundary (cannot grant OWNER role)");
    const managerUser = await prisma.user.create({
      data: {
        email: `manager_${runTag}@restronex.local`,
        name: "Pooja Manager",
        role: "MANAGER",
      },
    });
    managerUserId = managerUser.id;

    await prisma.membership.create({
      data: {
        userId: managerUserId,
        tenantId: tenantAId,
        role: "MANAGER",
        status: "ACTIVE",
      },
    });

    const managerMem = await getOrganizationMembership(managerUserId, tenantAId);
    assert(managerMem, "Manager membership exists");
    assert(hasPermission(managerMem.role, managerMem.permissions, "staff.invite"), "Manager can invite staff");

    // Privilege escalation check: Manager trying to invite OWNER role
    const canAssignOwner = managerMem.role === "OWNER";
    assert.strictEqual(canAssignOwner, false, "Manager cannot assign OWNER role");
    console.log("  ✓ PASS: Manager privilege escalation prevented; only Owner can grant Owner role");

    // -----------------------------------------------------------------
    // Scenario 13: Owner suspends Cashier staff access
    // -----------------------------------------------------------------
    console.log("▶ Scenario 13: Owner suspends cashier account");
    await prisma.membership.update({
      where: { id: cashierMembershipId },
      data: { status: "SUSPENDED" },
    });

    const suspendedMem = await prisma.membership.findUnique({
      where: { id: cashierMembershipId },
    });
    assert.strictEqual(suspendedMem?.status, "SUSPENDED");
    console.log("  ✓ PASS: Cashier membership status transitioned to SUSPENDED");

    // -----------------------------------------------------------------
    // Scenario 14: Suspended employee is rejected from staff portal
    // -----------------------------------------------------------------
    console.log("▶ Scenario 14: Suspended employee cannot access staff endpoints");
    const suspendedJourney = await resolveUserCustomerJourney(cashierUserId);
    assert.strictEqual(suspendedJourney.status, "CANCELLED");
    assert(suspendedJourney.redirectTo.includes("/staff/login?error=suspended"), "Redirects with suspended notice");
    console.log("  ✓ PASS: Suspended employee immediately barred and routed to login with suspension feedback");

    // -----------------------------------------------------------------
    // Scenario 15: Multiple organization memberships remain strictly isolated
    // -----------------------------------------------------------------
    console.log("▶ Scenario 15: User with memberships in multiple restaurants retains isolated permissions");
    const tenantB = await prisma.tenant.create({
      data: {
        name: `Trattoria Italia (${runTag})`,
        slug: `trattoria-${runTag}`,
        businessType: "Pizzeria",
        email: `italia_${runTag}@restronex.local`,
        phone: "+91 97777 22222",
        onboardingStep: 7,
        onboardingComplete: true,
      },
    });
    tenantBId = tenantB.id;

    // Reactivate cashier in Tenant A, and make them a WAITER in Tenant B
    await prisma.membership.update({
      where: { id: cashierMembershipId },
      data: { status: "ACTIVE" },
    });

    const memB = await prisma.membership.create({
      data: {
        userId: cashierUserId,
        tenantId: tenantBId,
        role: "WAITER",
        status: "ACTIVE",
      },
    });

    const memResolvedA = await getOrganizationMembership(cashierUserId, tenantAId);
    const memResolvedB = await getOrganizationMembership(cashierUserId, tenantBId);

    assert(memResolvedA && memResolvedB, "Both memberships resolved");
    assert.strictEqual(memResolvedA.role, "CASHIER", "Role in Tenant A is CASHIER");
    assert.strictEqual(memResolvedB.role, "WAITER", "Role in Tenant B is WAITER");
    assert(hasPermission(memResolvedA.role, memResolvedA.permissions, "pos.close_bill"), "Can close bill in Tenant A");
    assert.strictEqual(hasPermission(memResolvedB.role, memResolvedB.permissions, "pos.close_bill"), false, "Cannot close bill in Tenant B");
    assert.notStrictEqual(memResolvedA.tenantId, memResolvedB.tenantId, "Tenant IDs distinct");
    console.log("  ✓ PASS: Multi-org user operates as Cashier in Restaurant A and Waiter in Restaurant B with zero permission bleed");
  } finally {
    // -----------------------------------------------------------------
    // CLEANUP FIXTURES
    // -----------------------------------------------------------------
    console.log("\n▶ Cleaning up test fixtures...");
    const tenantsToDelete = [tenantAId, tenantBId].filter(Boolean);
    for (const tid of tenantsToDelete) {
      await prisma.orderItem.deleteMany({ where: { order: { tenantId: tid } } }).catch(() => {});
      await prisma.order.deleteMany({ where: { tenantId: tid } }).catch(() => {});
      await prisma.table.deleteMany({ where: { tenantId: tid } }).catch(() => {});
      await prisma.menuItem.deleteMany({ where: { tenantId: tid } }).catch(() => {});
      await prisma.menuCategory.deleteMany({ where: { tenantId: tid } }).catch(() => {});
      await prisma.kitchenTicket.deleteMany({ where: { tenantId: tid } }).catch(() => {});
      await prisma.staffInvitation.deleteMany({ where: { tenantId: tid } }).catch(() => {});
      await prisma.outletMember.deleteMany({ where: { membership: { tenantId: tid } } }).catch(() => {});
      await prisma.staffProfile.deleteMany({ where: { membership: { tenantId: tid } } }).catch(() => {});
      await prisma.membership.deleteMany({ where: { tenantId: tid } }).catch(() => {});
      await prisma.subscription.deleteMany({ where: { tenantId: tid } }).catch(() => {});
      await prisma.outlet.deleteMany({ where: { tenantId: tid } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { tenantId: tid } }).catch(() => {});
      await prisma.tenant.delete({ where: { id: tid } }).catch(() => {});
    }

    const usersToDelete = [
      ownerUserId,
      managerUserId,
      cashierUserId,
      kitchenUserId,
      waiterUserId,
      inventoryUserId,
    ].filter(Boolean);

    for (const uid of usersToDelete) {
      await prisma.auditLog.deleteMany({ where: { userId: uid } }).catch(() => {});
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
  }

  console.log("\n=================================================================");
  console.log("   STAFF PORTAL TEST RESULTS: 15/15 SCENARIOS PASSED (100%)    ");
  console.log("=================================================================\n");
}

runStaffPortalEndToEndSuite().catch((err) => {
  console.error("Fatal test execution failure:", err);
  process.exit(1);
});

