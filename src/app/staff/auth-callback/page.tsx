export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAuthenticatedUser, getOrganizationMembership } from "@/lib/server-auth";
import { cookies } from "next/headers";

export default async function StaffAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/staff/login");
  }

  const membership = await getOrganizationMembership(user.id);

  if (!membership) {
    redirect("/staff/login?error=no_membership");
  }

  if (membership.status !== "ACTIVE") {
    redirect("/staff/login?error=suspended");
  }

  // Set active organization cookie
  const c = await cookies();
  c.set("restronex_org", membership.tenantId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });

  const nextParam = sp.next;
  if (nextParam && nextParam.startsWith("/staff") && nextParam !== "/staff/login") {
    redirect(nextParam);
  }

  // Role-based landing routing
  const role = membership.role.toUpperCase();
  if (role === "CASHIER") {
    redirect("/staff/pos");
  } else if (role === "KITCHEN_STAFF") {
    redirect("/staff/kitchen");
  } else if (role === "WAITER") {
    redirect("/staff/tables");
  } else if (role === "INVENTORY_MANAGER") {
    redirect("/staff/inventory");
  }

  redirect("/staff/dashboard");
}

