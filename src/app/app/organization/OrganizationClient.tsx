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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Your Restaurants</h1>
        <p className="text-sm text-white/50">Maps to Clerk Organization • One user can belong to multiple restaurants • Select to switch outlet context • Tenant-isolated</p>
      </div>

      {msg && <div className="rounded-xl bg-[#3D954F] text-white p-3 text-sm">{msg}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-white border-slate-200">
          <CardHeader><CardTitle className="text-slate-900 flex items-center gap-2"><Building2 className="h-4 w-4" /> Your organizations</CardTitle><p className="text-xs text-slate-500">Select to continue • Entitlements per-tenant • POS gated server-side</p></CardHeader>
          <CardContent className="space-y-2">
            {orgs.length===0 ? <div className="text-sm text-slate-500 py-4 border border-dashed border-slate-200 rounded-xl text-center">No org yet — create your first restaurant below. In Clerk this is an Organization.</div> : orgs.map((m:any)=> (
              <div key={m.tenant?.id || m.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div><div className="text-sm font-bold text-slate-900">{m.tenant?.name || m.name}</div><div className="text-xs text-slate-500">{m.tenant?.businessType || m.businessType} • {m.role} • {m.tenant?.slug || m.slug}</div></div>
                <Button onClick={()=>selectOrg(m.tenant?.id || m.tenantId)} className="rounded-full bg-[#3D954F] hover:bg-[#2e7a3e] text-white text-xs px-4 py-1.5 h-8">Select <ChevronRight className="h-3 w-3 ml-1" /></Button>
              </div>
            ))}
            <div className="text-xs text-slate-400">Clerk Organizations → Tenant • Membership role mapped • Platform Admin can see all in /platform/tenants</div>
          </CardContent>
        </Card>

        <Card className="bg-[#0F1F14] border-white/10 text-white">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><Users className="h-4 w-4 text-[#3D954F]" /> Create new restaurant</CardTitle><p className="text-xs text-white/50">Creates Tenant + Membership (OWNER) + default Tax + outlet seed • Onboarding step 0</p></CardHeader>
          <CardContent>
            <form onSubmit={createOrg} className="space-y-3">
              <div><Label className="text-white/70">Restaurant name *</Label><Input name="name" required placeholder="Spice Route" defaultValue="Spice Route 2" className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
              <div className="grid grid-cols-2 gap-3"><div><Label className="text-white/70">Business type</Label><Input name="businessType" defaultValue="Casual Dining" className="mt-1 bg-white/5 border-white/10 text-white" /></div><div><Label className="text-white/70">Phone</Label><Input name="phone" defaultValue="+91 98765 43210" className="mt-1 bg-white/5 border-white/10 text-white" /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label className="text-white/70">Email</Label><Input name="email" placeholder="owner@spiceroute.com" className="mt-1 bg-white/5 border-white/10 text-white" /></div><div><Label className="text-white/70">City</Label><Input name="city" defaultValue="Bengaluru" className="mt-1 bg-white/5 border-white/10 text-white" /></div></div>
              <div><Label className="text-white/70">Address</Label><Input name="address" defaultValue="Koramangala, Bengaluru" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
              <div className="grid grid-cols-3 gap-2"><div><Label className="text-white/70">Country</Label><Input name="country" defaultValue="IN" className="mt-1 bg-white/5 border-white/10 text-white" /></div><div><Label className="text-white/70">Time zone</Label><Input name="timeZone" defaultValue="Asia/Kolkata" className="mt-1 bg-white/5 border-white/10 text-white" /></div><div><Label className="text-white/70">Currency</Label><Input name="currency" defaultValue="INR" className="mt-1 bg-white/5 border-white/10 text-white" /></div></div>
              <div><Label className="text-white/70">GSTIN</Label><Input name="gstNumber" placeholder="29ABCDE1234F1Z5" defaultValue="29ABCDE1234F1Z5" className="mt-1 bg-white/5 border-white/10 text-white" /></div>
              <Button type="submit" disabled={creating} className="w-full rounded-full bg-[#3D954F] hover:bg-[#2e7a3e] text-white">{creating ? "Creating..." : "Create restaurant →"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-wrap gap-2 text-xs justify-between">
        <span className="text-white/60">After selecting, you&apos;ll go to dashboard. If no subscription, you&apos;ll be prompted to checkout — trial available on Starter/Growth.</span>
        <Link href="/app/onboarding" className="text-[#3D954F] hover:text-white">Continue to onboarding →</Link>
      </div>
    </div>
  );
}
