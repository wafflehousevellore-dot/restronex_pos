import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { resolveUserCustomerJourney } from "@/lib/customer-journey";

export const dynamic = "force-dynamic";

export default async function OrganizationRedirectPage() {
  const { userId } = await getSession();
  if (!userId) {
    redirect("/sign-in?next=/app/organization");
  }
  try {
    const journey = await resolveUserCustomerJourney(userId);
    if (journey.status === "ACTIVE_PAID_ONBOARDED" || journey.status === "NEEDS_ONBOARDING") {
      redirect(journey.redirectTo);
    }
  } catch {}
  redirect("/app/organization");
}
