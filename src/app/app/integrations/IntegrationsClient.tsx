"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { INTEGRATIONS, getIntegrationMeta } from "@/lib/integrations";
import { Check, Plug, TestTube, Unplug, AlertCircle, Building2 } from "lucide-react";

export default function IntegrationsClient(){
  const [configs, setConfigs] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string,string>>({});
  const [msg, setMsg] = useState<{type:"success"|"error"|"info"; text:string}|null>(null);
  const [loading, setLoading] = useState(false);

  async function load(){
    const j = await apiFetch("/api/integrations").then(r=>r.json()).catch(()=>[]);
    if (Array.isArray(j)) setConfigs(j);
  }
  useEffect(()=>{ load(); },[]);

  function open(provider: string){
    setSelected(provider);
    setMsg(null);
    const cfg = configs.find((c:any)=>c.provider===provider);
    if (cfg?.configJson) {
      try{ setForm(JSON.parse(cfg.configJson)); }catch{ setForm({}); }
    } else setForm({});
  }

  async function save(){
    if (!selected) return;
    setLoading(true); setMsg({type:"info", text:"Saving credentials securely..."});
    const res = await apiFetch("/api/integrations", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ provider: selected, configJson: form })});
    const j = await res.json();
    if (!res.ok) setMsg({type:"error", text: j.error || "Failed"});
    else { setMsg({type:"success", text:`✓ ${selected} saved as CONFIGURED. Run Test to verify and get CONNECTED.`}); load(); }
    setLoading(false);
  }
  async function test(){
    if (!selected) return;
    setLoading(true); setMsg({type:"info", text:"Testing connection — verifying API key + permissions..."});
    const res = await apiFetch("/api/integrations", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ provider: selected, action:"test" })});
    const j = await res.json();
    if (!res.ok) setMsg({type:"error", text: j.error || "Test failed"});
    else setMsg({type: j.status==="CONNECTED" ? "success" : "error", text: j.testResult + (j.status==="CONNECTED" ? " • Status now CONNECTED." : " • Status ERROR.")});
    load(); setLoading(false);
  }
  async function disconnect(){
    if (!selected) return;
    if (!confirm(`Disconnect ${selected}?`)) return;
    setLoading(true);
    const res = await apiFetch("/api/integrations", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ provider: selected, action:"disconnect" })});
    const j = await res.json();
    if (!res.ok) setMsg({type:"error", text: j.error});
    else { setMsg({type:"info", text:`Disconnected ${selected} • Status NOT_CONNECTED`}); setForm({}); load(); }
    setLoading(false);
  }

  function statusMap(provider: string){
    const c = configs.find((x:any)=>x.provider===provider);
    return c?.status || "NOT_CONNECTED";
  }
  function statusBadge(s:string){
    if (s==="CONNECTED") return <span className="rounded-full bg-[#3D954F] text-white px-2.5 py-1 text-xs font-bold">Connected ✓</span>;
    if (s==="CONFIGURED") return <span className="rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-300 px-2.5 py-1 text-xs font-bold">Configured — test to verify</span>;
    if (s==="ERROR") return <span className="rounded-full bg-red-500/15 border border-red-500/20 text-red-300 px-2.5 py-1 text-xs font-bold">Error</span>;
    return <span className="rounded-full bg-white/5 border border-white/10 text-white/40 px-2.5 py-1 text-xs font-bold">Not connected</span>;
  }

  const meta = selected ? getIntegrationMeta(selected) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-black text-white">Integrations — Verified Connections</h1><p className="text-sm text-white/50">We never fake connected. <b className="text-white">Connected = verified via test.</b> Configured = credentials saved, not verified. Errors shown honestly.</p></div>
        <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-white/60">{configs.filter((c:any)=>c.status==="CONNECTED").length} connected • {configs.length} configured</span>
      </div>

      {msg && <div className={`rounded-xl border p-3 text-sm ${msg.type==="success" ? "bg-[#3D954F]/15 border-[#3D954F]/30 text-white" : msg.type==="error" ? "bg-red-500/10 border-red-500/20 text-red-200" : "bg-white/5 border-white/10 text-white/70"}`}>{msg.text}</div>}

      <div className="grid lg:grid-cols-[420px_1fr] gap-6">
        <div className="space-y-2">
          {INTEGRATIONS.map(item=>{
            const st = statusMap(item.provider);
            const isSel = selected===item.provider;
            return (
              <button key={item.provider} onClick={()=>open(item.provider)} className={`w-full text-left rounded-2xl border p-4 transition ${isSel ? "bg-[#0F1F14] border-[#3D954F]/40 shadow-lg" : "bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-white/20"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div><div className="text-sm font-bold text-white">{item.name}</div><div className="text-xs text-white/50 mt-0.5">{item.description}</div><div className="mt-2 text-xs text-white/30">{item.category} • {item.requiredFields.length ? `${item.requiredFields.length} fields` : "No credentials needed"}</div></div>
                  <div className="shrink-0">{statusBadge(st)}</div>
                </div>
              </button>
            );
          })}
          <DarkCard><CardContent className="pt-4 text-xs text-white/40">Adapter interface: <code>connect()</code> <code>sync()</code> <code>getStatus()</code> — honest states. Skippable during onboarding, completable in dashboard. Swiggy/Zomato require partner approval + API keys — we show blocked state if missing.</CardContent></DarkCard>
        </div>

        <div>
          {!selected ? (
            <DarkCard className="p-8 text-center">
              <Plug className="h-8 w-8 text-white/20 mx-auto" />
              <div className="mt-3 text-sm font-bold text-white">Select an integration</div><div className="text-xs text-white/40">View, configure, connect, test, disconnect. You can skip during onboarding and finish later here.</div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-left">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3"><b className="text-white">Swiggy</b> — requires Partner API key + store ID + partner permissions.</div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3"><b className="text-white">Zomato</b> — requires Restaurant ID + API key + partner permissions.</div>
              </div>
            </DarkCard>
          ) : (
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader><CardTitle className="text-slate-900 flex items-center justify-between">{meta?.name} <span>{statusBadge(statusMap(selected))}</span></CardTitle><p className="text-xs text-slate-500">{meta?.description}</p>{meta?.docsUrl && <a href={meta.docsUrl} target="_blank" className="text-xs text-[#3D954F] underline">{meta.docsUrl}</a>}</CardHeader>
              <CardContent className="space-y-4">
                {meta && meta.requiredFields.length===0 && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">No credentials required. This integration is ready — save to mark CONFIGURED, test to verify.</div>}
                {meta?.requiredFields.map(f=> (
                  <div key={f.key}><Label className="text-slate-700 text-xs">{f.label} *</Label><Input value={form[f.key] || ""} onChange={e=>setForm({...form, [f.key]: e.target.value})} placeholder={f.placeholder} className="mt-1 bg-white border-slate-200" /></div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={save} disabled={loading} className="rounded-full bg-[#3D954F] hover:bg-[#2e7a3e] text-white"><Check className="h-4 w-4 mr-1" /> Save as Configured</Button>
                  <Button onClick={test} disabled={loading} variant="outline" className="rounded-full border-slate-300 text-slate-700 hover:bg-slate-50"><TestTube className="h-4 w-4 mr-1" /> Test & verify</Button>
                  <Button onClick={disconnect} disabled={loading} variant="outline" className="rounded-full border-red-200 text-red-600 hover:bg-red-50"><Unplug className="h-4 w-4 mr-1" /> Disconnect</Button>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  <div className="font-bold text-slate-900">Honest statuses:</div>
                  <ul className="mt-1 space-y-1"><li>• <b>NOT_CONNECTED</b> — no credentials, not attempted</li><li>• <b>CONFIGURED</b> — credentials saved, awaiting test (not yet verified)</li><li>• <b>CONNECTED</b> — test passed, sync enabled, lastSyncAt updated</li><li>• <b>ERROR</b> — test failed, check keys/permissions (details shown)</li></ul>
                  <div className="mt-2 text-slate-500">Provider APIs block without partner approval — we never display “Connected” unless verified. See /api/integrations for server logs.</div>
                </div>
                {(() => {
                  const cfg = configs.find((c:any)=>c.provider===selected);
                  return cfg ? <div className="text-xs text-slate-500">Last sync: {cfg.lastSyncAt ? new Date(cfg.lastSyncAt).toLocaleString() : "Never"} • Status: <b>{cfg.status}</b> • {cfg.configJson ? "Credentials stored (encrypted at rest in production)" : "No credentials"}</div> : null;
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
