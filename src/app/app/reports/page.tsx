import { Metadata } from "next";
import { ReportsClient } from "@/components/app/reports/ReportsClient";

export const metadata: Metadata = {
  title: "Reports & Analytics | RestroNex",
  description: "Enterprise restaurant reporting, executive intelligence, GST tax reports, inventory valuation, cash variance and audit logs.",
};

export default function ReportsPage() {
  return <ReportsClient />;
}
