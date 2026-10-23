import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import OrganizationClient from "./OrganizationClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrganizationPage(){
  const { userId } = await getSession();
  if (!userId) redirect("/sign-in?next=/organization");
  const memberships = await prisma.membership.findMany({ where:{ userId }, include:{ tenant:true }});
  // Pass to client — allow create/select
  return <OrganizationClient initialOrgs={memberships as any} />;
}
