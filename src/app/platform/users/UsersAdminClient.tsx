"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users } from "lucide-react";

const ROLE_OPTIONS = ["OWNER", "HEAD_OFFICE", "OUTLET_MANAGER", "CASHIER", "WAITER", "KITCHEN_STAFF"];

export default function UsersAdminClient({
  initialUsers,
  primaryOwnerEmail,
}: {
  initialUsers: any[];
  primaryOwnerEmail: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function updateMembershipRole(userId: string, membershipId: string, role: string) {
    setBusyId(membershipId);
    setMsg(null);
    try {
      const res = await fetch("/api/platform/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MEMBERSHIP_ROLE",
          membershipId,
          role,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to update role");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                memberships: u.memberships.map((m: any) =>
                  m.id === membershipId ? { ...m, role } : m
                ),
              }
            : u
        )
      );
      setMsg(`✓ Updated organization membership role to ${role} (audit logged).`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#172B25] flex items-center gap-2">
            <Users className="h-5 w-5 text-[#16845B]" />
            <span>Platform Users &amp; Access Control</span>
          </h1>
          <p className="text-sm text-[#718078]">
            Manage user workspace memberships. Primary Platform Owner privileges are strictly bound to verified{" "}
            <b className="text-[#172B25]">{primaryOwnerEmail}</b>.
          </p>
        </div>
        {msg && (
          <span className="text-xs font-bold text-[#16845B] bg-[#E8F5EE] border border-[#16845B]/20 px-3.5 py-1.5 rounded-full">
            {msg}
          </span>
        )}
      </div>

      <div className="grid gap-3.5">
        {users.map((u) => {
          const isPrimaryOwner =
            u.isPlatformAdmin &&
            u.role === "PLATFORM_OWNER" &&
            u.email.toLowerCase() === primaryOwnerEmail.toLowerCase();

          return (
            <Card key={u.id} className="bg-white border-[#E5EBE7] shadow-xs">
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#172B25] text-sm">{u.name}</span>
                      {isPrimaryOwner ? (
                        <Badge className="bg-[#16845B] text-white text-[10px]">
                          <ShieldCheck className="h-3 w-3 mr-1" /> PLATFORM_OWNER
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-[#F8FAF9] text-[#718078] border-[#E5EBE7] text-[10px]">
                          CUSTOMER ({u.role})
                        </Badge>
                      )}
                      {u.clerkId ? (
                        <span className="text-[10px] font-mono text-[#16845B] bg-[#E8F5EE] px-2 py-0.5 rounded-full">
                          Clerk Linked
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                          Local Staff Account
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#718078] mt-1">{u.email}</div>
                  </div>
                  <div className="text-[11px] font-mono text-[#718078]">
                    Joined {new Date(u.createdAt).toLocaleDateString("en-IN")}
                  </div>
                </div>

                {u.memberships?.length > 0 && (
                  <div className="border-t border-[#E5EBE7] pt-3 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                      Organization Memberships
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {u.memberships.map((m: any) => (
                        <div
                          key={m.id}
                          className="rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-3 py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-[#172B25] truncate">{m.tenant?.name}</div>
                            <div className="text-[10px] text-[#718078] truncate">{m.tenant?.slug}</div>
                          </div>
                          <select
                            value={m.role}
                            disabled={busyId === m.id}
                            onChange={(e) => updateMembershipRole(u.id, m.id, e.target.value)}
                            className="rounded-lg border border-[#E5EBE7] bg-white px-2 py-1 text-[11px] font-semibold text-[#172B25]"
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
