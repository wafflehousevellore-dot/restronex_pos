export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import { Utensils, Building2, ArrowRight, ShieldCheck, User } from "lucide-react";

export default async function ChooseOrganizationPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/staff/login");
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      tenant: { select: { id: true, name: true, slug: true, status: true } },
      outletMembers: {
        where: { status: "ACTIVE" },
        include: { outlet: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    redirect("/staff/auth-callback");
  }

  if (memberships.length === 1) {
    redirect(`/staff/auth-callback?org=${memberships[0].tenantId}`);
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/20 mb-4 shadow-sm">
          <Utensils className="w-7 h-7 text-[#16845B]" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0F1E19]">
          Select Restaurant
        </h1>
        <p className="mt-2 text-sm text-[#4A5D55]">
          You have access to multiple restaurant workspaces. Choose where you want to work today.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow-xl shadow-black/5 sm:rounded-3xl sm:px-8 border border-[#E3EBE6] space-y-4">
          <div className="flex items-center gap-2 text-xs text-[#4A5D55] bg-gray-50 p-2.5 rounded-xl border border-gray-200 mb-4">
            <User className="w-4 h-4 text-[#16845B]" />
            <span>Signed in as <b className="text-gray-900">{user.email}</b></span>
          </div>

          <div className="divide-y divide-[#EEF3F0]">
            {memberships.map((m) => {
              const outlets = m.outletMembers.map((om) => om.outlet.name);
              return (
                <div key={m.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#E8F5EE] flex items-center justify-center text-[#16845B]">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-[#0F1E19] text-base">{m.tenant.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#6F8279]">
                      <span className="font-semibold text-[#16845B] bg-[#E8F5EE] px-2 py-0.5 rounded-md">
                        {m.role}
                      </span>
                      {outlets.length > 0 && <span>• {outlets.join(", ")}</span>}
                    </div>
                  </div>

                  <Link
                    href={`/staff/auth-callback?org=${m.tenantId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#16845B] hover:bg-[#126B49] text-white font-semibold text-xs transition shadow-xs"
                  >
                    <span>Enter</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-[#EEF3F0] text-center">
            <Link
              href="/staff/login"
              className="text-xs font-semibold text-[#6F8279] hover:text-[#0F1E19] transition"
            >
              Sign out or switch user
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#6F8279]">
          <ShieldCheck className="w-4 h-4 text-[#16845B]" />
          <span>RestroNex Secure Multi-Tenant Architecture</span>
        </div>
      </div>
    </div>
  );
}
