"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Building2, Check, ChevronRight, Users } from "lucide-react";
import Link from "next/link";

export default function OrganizationClient({ initialOrgs }: { initialOrgs: any[] }) {
  const [orgs, setOrgs] = useState<any[]>(initialOrgs);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string|null>(null);
  const [selected, setSelected] = useState<string|null>(null);

  async function refresh(){
    const j = await apiFetch("/api/tenants").then(r=>r.json()).catch(()=>[]);
    if (Array.isArray(j)) setOrgs(j);
  }

  async function selectOrg(tenantId: string){
    setSelected(tenantId);
    await fetch("/api/tenants/select", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ tenantId }), credentials:"same-origin" });
    document.cookie = `restronex_org=${tenantId}; Path=/; Max-Age=${60*60*24*30}; SameSite=Lax`;
    window.location.href = "/app/dashboard";
  }

  async function createOrg(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setCreating(true); setMsg(null);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await apiFetch("/api/tenants", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!res.ok) setMsg(j.error || "Failed");
    else {
      setMsg(`Created ${j.slug} — ${j.tenantId}`);
      await refresh();
      setTimeout(()=> selectOrg(j.tenantId), 500);
    }
    setCreating(false);
  }

  return (
    <div className="space-y-6 text-[#172B25]">
      <div>
        <h1 className="text-2xl font-black text-[#172B25]">Your Restaurants</h1>
        <p className="text-sm text-[#718078]">Tenant isolated • Switch restaurant context anytime</p>
      </div>

      {msg && (
        <div className="rounded-xl bg-[#E8F5EE] border border-[#16845B]/30 text-[#16845B] p-3 text-sm font-semibold">
          {msg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25] flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#16845B]" /> Your Restaurants
            </CardTitle>
            <p className="text-xs text-[#718078]">Select an outlet to enter its workspace</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {orgs.length===0 ? (
              <div className="text-sm text-[#718078] py-8 border border-dashed border-[#E5EBE7] rounded-xl text-center bg-[#F8FAF9]">
                No restaurant businesses found. Create your first restaurant in the form to the right.
              </div>
            ) : (
              orgs.map((m:any)=> (
                <div key={m.tenant?.id || m.id} className="flex items-center justify-between rounded-xl border border-[#E5EBE7] bg-[#F8FAF9] px-4 py-3 hover:bg-white hover:shadow-xs transition">
                  <div>
                    <div className="text-sm font-bold text-[#172B25]">{m.tenant?.name || m.name}</div>
                    <div className="text-xs text-[#718078]">{m.tenant?.businessType || m.businessType} • {m.role} • {m.tenant?.slug || m.slug}</div>
                  </div>
                  <Button
                    onClick={()=>selectOrg(m.tenant?.id || m.tenantId)}
                    className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs px-4 py-1.5 h-8 shadow-xs"
                  >
                    Select <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))
            )}
            <div className="text-xs text-[#718078] pt-2">Multi-tenant architecture enforces strict data isolation between restaurants.</div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E5EBE7] shadow-xs">
          <CardHeader>
            <CardTitle className="text-[#172B25] flex items-center gap-2">
              <Users className="h-4 w-4 text-[#16845B]" /> Create New Restaurant
            </CardTitle>
            <p className="text-xs text-[#718078]">Initializes Tenant + Owner Membership + GST defaults</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={createOrg} className="space-y-3">
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Restaurant Name *</Label>
                <Input name="name" required placeholder="e.g. Spice Route" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[#718078] text-xs font-semibold">Business Type</Label>
                  <Input name="businessType" defaultValue="Casual Dining" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm" />
                </div>
                <div>
                  <Label className="text-[#718078] text-xs font-semibold">Phone</Label>
                  <Input name="phone" defaultValue="+91 98765 43210" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[#718078] text-xs font-semibold">Email</Label>
                  <Input name="email" placeholder="owner@restaurant.com" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm" />
                </div>
                <div>
                  <Label className="text-[#718078] text-xs font-semibold">City</Label>
                  <Input name="city" defaultValue="Bengaluru" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Address</Label>
                <Input name="address" defaultValue="Koramangala, Bengaluru" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm" />
              </div>
              <div>
                <Label className="text-[#718078] text-xs font-semibold">GSTIN</Label>
                <Input name="gstNumber" placeholder="29ABCDE1234F1Z5" defaultValue="29ABCDE1234F1Z5" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm" />
              </div>
              <Button
                type="submit"
                disabled={creating}
                className="w-full rounded-full bg-[#16845B] hover:bg-[#116B49] text-white font-bold py-2.5 shadow-xs transition"
              >
                {creating ? "Creating..." : "Create Restaurant →"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
