export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resolveUserCustomerJourney } from "@/lib/customer-journey";
import { cookies } from "next/headers";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const { userId } = await getSession();

  if (!userId) {
    redirect("/sign-in");
  }

  const c = await cookies();
  const planSlug = sp.plan || c.get("restronex_plan")?.value || null;
  const billingCycle = sp.cycle || c.get("restronex_cycle")?.value || null;

  const journey = await resolveUserCustomerJourney(userId, {
    planSlug,
    billingCycle,
  });

  redirect(journey.redirectTo);
}

