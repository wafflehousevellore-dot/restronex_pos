export const dynamic = "force-dynamic";
import { calculatePlatformFinancialMetrics } from "@/lib/platform-revenue";
import RevenueAdminClient from "./RevenueAdminClient";

export default async function PlatformRevenuePage() {
  const metrics = await calculatePlatformFinancialMetrics();
  return <RevenueAdminClient initialMetrics={metrics} />;
}
