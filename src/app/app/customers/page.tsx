import { Metadata } from "next";
import { CrmClient } from "@/components/app/crm/CrmClient";

export const metadata: Metadata = {
  title: "Customer CRM & Loyalty | RestroNex",
  description: "Enterprise restaurant customer relationship management, points loyalty program, coupons and WhatsApp marketing automation.",
};

export default function CustomersPage() {
  return <CrmClient />;
}
