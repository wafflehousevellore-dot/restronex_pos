export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { ensureSeedPlans } from "@/lib/seed";
import PlansAdminClient from "./PlansAdminClient";

export default async function PlansAdminPage() {
  await ensureSeedPlans();
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } });
  return <PlansAdminClient initialPlans={plans} />;
}
