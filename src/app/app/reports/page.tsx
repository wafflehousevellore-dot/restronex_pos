import { FinanceClient } from "@/components/app/finance/FinanceClient";

export const metadata = {
  title: "Finance & Reports | RestroNex",
  description: "Enterprise restaurant finance, GST tax management, day-end closing, and payment reconciliation.",
};

export default function ReportsPage() {
  return <FinanceClient />;
}
