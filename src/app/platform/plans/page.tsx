export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import PlansAdminClient from "./PlansAdminClient";

export default async function PlansAdminPage() {
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } });
  return <PlansAdminClient initialPlans={plans} />;
}
