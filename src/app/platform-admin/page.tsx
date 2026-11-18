export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";

export default function PlatformAdminRedirectPage() {
  redirect("/platform");
}
