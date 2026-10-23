"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Save, SkipForward } from "lucide-react";
import Link from "next/link";

const steps = ["Business","Outlet","Tables","Menu","Tax","Staff","Plan","Launch"] as const;

export default function Onboarding(){
  const [step,setStep]=useState(0);
  const [tenantId,setTenantId]=useState<string | null>(null);
  const [tenantName,setTenantName]=useState<string|null>(null);
  const [msg,setMsg]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [hasSubscription,setHasSubscription]=useState(false);

  async function saveProgress(newStep: number, complete=false){
    setStep(newStep);
    if (tenantId) {
      try{ await apiFetch("/api/onboarding/progress",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ tenantId, step: newStep, complete })}); }catch{}
    }
  }

  useEffect(()=>{
    (async()=>{
      try{
        const p = await apiFetch("/api/onboarding/progress").then(r=>r.json());
        if (p.tenantId){
          setTenantId(p.tenantId);
          setTenantName(p.name);
          setStep(p.onboardingStep || 0);
          if (p.onboardingComplete) setMsg(`Welcome back — you completed onboarding for ${p.name}. Continue where you left off or jump to POS.`);
        }
        // Check subscription for Plan step honesty
        if (p.tenantId) {
          const sub = await apiFetch(`/api/subscription/status?tenantId=${p.tenantId}`).then(r=>r.json()).catch(()=>null);
          if (sub?.hasActiveSubscription) setHasSubscription(true);
        }
      }catch{} finally{ setLoading(false); }
    })();
  },[]);

  async function createBusiness(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const body=Object.fromEntries(fd.entries());
    const res=await apiFetch("/api/tenants",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(body)});
    const j=await res.json();
    if(res.ok){
      setTenantId(j.tenantId); setTenantName(body.name as string || j.slug);
      setMsg(`Business created: ${j.slug} ✓`);
      document.cookie=`restronex_org=${j.tenantId}; Path=/; SameSite=Lax`;
      await saveProgress(1);
    } else setMsg(j.error || "Failed to create business");
  }

  if (loading) return <div className="max-w-3xl mx-auto p-8 text-center text-white/50 text-sm">Loading onboarding progress…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div><h1 className="text-2xl font-black text-white">8-Step Onboarding</h1><p className="text-sm text-white/60">Business → Outlet → Tables → Menu → Tax → Staff → Plan → Launch • Progress saved • Skip integration to finish later in dashboard</p></div>
        {tenantId && <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/60">{tenantName} • {tenantId.slice(0,8)}</span>}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {steps.map((s,i)=> (
          <button key={s} onClick={()=>{ if(tenantId || i===0) saveProgress(i); }} className={`rounded-xl px-2 py-2 text-center text-[11px] font-bold transition ${i===step ? "bg-[#3D954F] text-white shadow" : i<step ? "bg-[#3D954F]/20 text-white border border-[#3D954F]/30 hover:bg-[#3D954F]/30" : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"}`}>
            <div className="flex items-center justify-center gap-1">{i<step ? <Check className="h-3 w-3" /> : null}{i+1}. {s}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 text-xs">
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-white/60">Step {step+1} of 8</span>
        <span className="rounded-full bg-[#3D954F]/10 border border-[#3D954F]/20 px-3 py-1.5 text-[#3D954F]">{tenantId ? "Progress auto-saved" : "Create business to save progress"}</span>
        <Link href="/app/integrations" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/60 hover:bg-white/10">Integrations can be skipped → setup later</Link>
      </div>

      {msg && <div className="rounded-xl bg-[#3D954F] text-white p-3 text-sm flex items-center gap-2"><Check className="h-4 w-4" />{msg}</div>}

      {step===0 && (
        <Card>
          <CardHeader><CardTitle>Step 1 — Business Profile</CardTitle><p className="text-xs text-white/50">Maps to Clerk Organization • GSTIN for e-invoice • Tenant-isolated • Trial starts after business creation</p></CardHeader>
          <CardContent>
            {tenantId ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">✓ Business already created: <b>{tenantName}</b> ({tenantId.slice(0,8)})<div className="mt-2 flex gap-2"><Button onClick={()=>saveProgress(1)} className="rounded-full bg-[#3D954F] text-white">Continue to outlet →</Button><Link href="/app/organization" className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">Switch organization</Link></div></div>
            ) : (
            <form onSubmit={createBusiness} className="space-y-3">
              <div><Label>Business name *</Label><Input name="name" required placeholder="Spice Route" defaultValue="Spice Route"/></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Business type</Label><Input name="businessType" defaultValue="Fine Dining" /></div><div><Label>Phone</Label><Input name="phone" defaultValue="+91 98765 43210"/></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Email</Label><Input name="email" placeholder="owner@spiceroute.com"/></div><div><Label>City</Label><Input name="city" defaultValue="Bengaluru"/></div></div>
              <div><Label>Address</Label><Input name="address" defaultValue="Koramangala, Bengaluru"/></div>
              <div className="grid grid-cols-3 gap-3"><div><Label>Country</Label><Input name="country" defaultValue="IN"/></div><div><Label>Time zone</Label><Input name="timeZone" defaultValue="Asia/Kolkata"/></div><div><Label>Currency</Label><Input name="currency" defaultValue="INR"/></div></div>
              <div><Label>GST Number</Label><Input name="gstNumber" placeholder="29ABCDE1234F1Z5" defaultValue="29ABCDE1234F1Z5"/></div>
              <Button type="submit" className="rounded-full bg-[#3D954F] hover:bg-[#2e7a3e] text-white w-full">Create business & continue →</Button>
              <div className="text-xs text-slate-500">Trial (Starter/Growth) will be offered at Plan step — eligible without card. Enterprise requires checkout.</div>
            </form>
            )}
          </CardContent>
        </Card>
      )}

      {step===1 && (
        <Card>
          <CardHeader><CardTitle>Step 2 — First Outlet</CardTitle><p className="text-xs text-white/50">Outlet auto-seeded • Add more in Outlets • Multi-terminal ready</p></CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-white">✓ Main outlet live • <b>Koramangala Flagship</b> • 12 tables seeded across Main Hall / Terrace / AC • Chain-ready (add outlets up to plan limit)</div>
            <div className="flex gap-2 flex-wrap"><Button onClick={()=>saveProgress(2)} className="rounded-full bg-[#3D954F] text-white">Continue →</Button><Button variant="outline" onClick={()=>saveProgress(2)} className="rounded-full border-white/15 bg-transparent text-white"><SkipForward className="h-3 w-3 mr-1" />Skip for now</Button><Link href="/app/outlets" className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10">Manage outlets</Link></div>
          </CardContent>
        </Card>
      )}

      {step===2 && (
        <Card>
          <CardHeader><CardTitle>Step 3 — Floor & Tables</CardTitle><p className="text-xs text-white/50">12 tables seeded • Area-wise • Status cycle AVAILABLE→OCCUPIED→RESERVED</p></CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            <div className="rounded-xl bg-[#3D954F]/15 border border-[#3D954F]/20 p-3 text-white">Tables: 12 • Areas: Main Hall, Terrace, AC • QR per table • Transfer/merge supported • Tap in Tables to cycle status</div>
            <div className="flex gap-2 flex-wrap"><Button onClick={()=>saveProgress(3)} className="rounded-full bg-[#3D954F] text-white">Continue →</Button><Button variant="outline" onClick={()=>saveProgress(3)} className="rounded-full border-white/15 bg-transparent text-white"><SkipForward className="h-3 w-3 mr-1" />Skip</Button><Link href="/app/tables"><Button variant="outline" className="rounded-full border-white/15 bg-transparent text-white">View tables</Button></Link></div>
          </CardContent>
        </Card>
      )}

      {step===3 && (
        <Card>
          <CardHeader><CardTitle>Step 4 — Menu Setup</CardTitle><p className="text-xs text-white/50">Categories → Items → Variants → Modifiers • Paise-precise • Channel pricing</p></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-white/70">5 items seeded (Margherita ₹299, Farmhouse ₹399, Cold Coffee ₹149…) • Add variants (size), modifiers (extra cheese +₹30) in Menu. POS uses paise-precise totals.</div>
            <div className="flex gap-2 flex-wrap"><Button onClick={()=>saveProgress(4)} className="rounded-full bg-[#3D954F] text-white">Continue →</Button><Button variant="outline" onClick={()=>saveProgress(4)} className="rounded-full border-white/15 bg-transparent text-white">Skip</Button><Link href="/app/menu"><Button variant="outline" className="rounded-full border-white/15 bg-transparent text-white">Edit menu</Button></Link></div>
          </CardContent>
        </Card>
      )}

      {step===4 && (
        <Card>
          <CardHeader><CardTitle>Step 5 — Tax & Billing Rules</CardTitle><p className="text-xs text-white/50">CGST+SGST 9% each • Minor-unit arithmetic • Inclusive/exclusive • Service charge</p></CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-white">GSTIN linked • CGST 900 bps + SGST 900 bps = 18% • Tax = round(amount × bps / 10000) in paise • No float. Receipt header/footer in Settings. POS auto-adds CGST+SGST.</div>
            <div className="flex gap-2 flex-wrap"><Button onClick={()=>saveProgress(5)} className="rounded-full bg-[#3D954F] text-white">Continue →</Button><Link href="/app/settings"><Button variant="outline" className="rounded-full border-white/15 bg-transparent text-white">Tax settings</Button></Link></div>
          </CardContent>
        </Card>
      )}

      {step===5 && (
        <Card>
          <CardHeader><CardTitle>Step 6 — Staff & Roles</CardTitle><p className="text-xs text-white/50">8 roles • OWNER, Head Office, Outlet Manager, Cashier, Kitchen, Waiter, Inventory, Platform Admin</p></CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            <div>Invite by email in <b className="text-slate-900 dark:text-white">Staff</b> with role + outlet scope. Tenant-isolated, audit-logged. OWNER can manage all. You can skip and invite later from dashboard.</div>
            <div className="flex gap-2 flex-wrap"><Button onClick={()=>saveProgress(6)} className="rounded-full bg-[#3D954F] text-white">Continue →</Button><Button variant="outline" onClick={()=>saveProgress(6)} className="rounded-full border-white/15 bg-transparent text-white"><SkipForward className="h-3 w-3 mr-1" />Skip for now</Button><Link href="/app/staff"><Button variant="outline" className="rounded-full border-white/15 bg-transparent text-white">Manage staff</Button></Link></div>
          </CardContent>
        </Card>
      )}

      {step===6 && (
        <Card>
          <CardHeader><CardTitle>Step 7 — Plan & Checkout</CardTitle><p className="text-xs text-white/50">Starter vs Growth vs Scale • Trials • Razorpay • Server-verified entitlements</p></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {hasSubscription ? <div className="flex items-center justify-between rounded-xl bg-[#3D954F]/20 border border-[#3D954F]/30 text-slate-900 dark:text-white px-4 py-3"><span>✓ Subscription active — entitlements unlocked</span><Badge variant="success">Active</Badge></div> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No active subscription yet — choose a plan in checkout. Growth/Scale trials available (no card).</div>}
            <div className="text-xs text-slate-500">Checkout at <Link href="/checkout" className="text-[#3D954F] underline">/checkout</Link> shows plan, cycle, GST 18%, total payable, Razorpay (simulated in mock mode, live when keys set). Webhook HMAC verified + idempotent. Subscription gates server-side.</div>
            <div className="flex gap-2 flex-wrap"><Button onClick={()=>saveProgress(7)} className="rounded-full bg-[#3D954F] text-white">Continue to launch →</Button><Link href="/pricing"><Button variant="outline" className="rounded-full border-slate-300">View plans</Button></Link><Link href="/checkout"><Button className="rounded-full bg-[#070B07] text-white">Go to checkout →</Button></Link></div>
            <div className="text-xs text-slate-500">You can skip checkout for now — Starter/Growth allow 14-day trial. Enterprise requires paid activation.</div>
          </CardContent>
        </Card>
      )}

      {step===7 && (
        <Card>
          <CardHeader><CardTitle>Step 8 — Ready to Launch 🚀</CardTitle><p className="text-xs text-white/50">POS • KOT • Inventory • CRM • Reports • All tenant-isolated</p></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-[#3D954F] text-white p-4 text-sm font-medium">All set! Business ✓ Outlet ✓ Tables ✓ Menu ✓ Tax ✓ Staff ✓ Plan ✓ → POS is live. Inventory, KDS, CRM, Reports, Integrations ready. Onboarding complete saved.</div>
            <div className="flex flex-wrap gap-2"><Button onClick={async()=>{ await saveProgress(7,true); window.location.href="/app/dashboard"; }} className="rounded-full bg-[#3D954F] hover:bg-[#2e7a3e] text-white"><Save className="h-4 w-4 mr-1" /> Mark complete & go to Dashboard</Button><Link href="/app/pos"><Button className="rounded-full bg-[#070B07] border border-white/15 text-white hover:bg-white/10">Open POS — Start Billing</Button></Link><Link href="/app/kitchen"><Button variant="outline" className="rounded-full border-white/15 bg-transparent text-white">KDS</Button></Link><Link href="/app/integrations"><Button variant="outline" className="rounded-full border-white/15 bg-transparent text-white"><SkipForward className="h-3 w-3 mr-1" />Configure integrations</Button></Link></div>
            <div className="text-xs text-slate-500">Integrations were skippable — configure Swiggy/Zomato later from <Link href="/app/integrations" className="text-[#3D954F]">Integrations</Link>. Printer/QR ready.</div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-wrap gap-2 justify-between text-xs">
        <span className="text-white/60">Progress is saved — close and return anytime. You are on step {step+1} of 8.</span>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>saveProgress(Math.max(0, step-1))} className="rounded-full border-white/15 bg-transparent text-white h-8">← Back</Button><Button size="sm" onClick={()=>saveProgress(Math.min(7, step+1))} className="rounded-full bg-white/10 border-white/15 text-white h-8">Skip <ChevronRight className="h-3 w-3 ml-1" /></Button></div>
      </div>
    </div>
  );
}
