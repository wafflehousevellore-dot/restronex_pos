"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { INTEGRATIONS, getIntegrationMeta } from "@/lib/integrations";
import { Check, Plug, TestTube, Unplug } from "lucide-react";

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
    if (s==="CONNECTED") return <span className="rounded-full bg-[#E8F5EE] border border-[#E5EBE7] text-[#16845B] px-2.5 py-0.5 text-xs font-bold">Connected ✓</span>;
    if (s==="CONFIGURED") return <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-0.5 text-xs font-bold">Configured</span>;
    if (s==="ERROR") return <span className="rounded-full bg-red-50 border border-red-200 text-red-700 px-2.5 py-0.5 text-xs font-bold">Error</span>;
    return <span className="rounded-full bg-[#F8FAF9] border border-[#E5EBE7] text-[#718078] px-2.5 py-0.5 text-xs font-medium">Not connected</span>;
  }

  const meta = selected ? getIntegrationMeta(selected) : null;

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#172B25]">Integrations & Marketplaces</h1>
          <p className="text-sm text-[#718078]">Connected = verified via live test. Configured = credentials saved. Honest error reporting.</p>
        </div>
        <span className="rounded-full bg-white border border-[#E5EBE7] px-3.5 py-1 text-xs text-[#718078] font-medium shadow-xs">
          {configs.filter((c:any)=>c.status==="CONNECTED").length} connected • {configs.length} configured
        </span>
      </div>

      {msg && (
        <div className={`rounded-xl border p-3 text-sm ${
          msg.type==="success" ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]" : msg.type==="error" ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="grid lg:grid-cols-[420px_1fr] gap-6">
        <div className="space-y-2.5">
          {INTEGRATIONS.map(item=>{
            const st = statusMap(item.provider);
            const isSel = selected===item.provider;
            return (
              <button
                key={item.provider}
                onClick={()=>open(item.provider)}
                className={`w-full text-left rounded-2xl border p-4 transition ${
                  isSel
                    ? "bg-[#E8F5EE] border-[#16845B] shadow-xs"
                    : "bg-white border-[#E5EBE7] hover:bg-[#F8FAF9]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-[#172B25]">{item.name}</div>
                    <div className="text-xs text-[#718078] mt-0.5">{item.description}</div>
                    <div className="mt-2 text-xs text-[#718078]">{item.category} • {item.requiredFields.length ? `${item.requiredFields.length} fields` : "No credentials needed"}</div>
                  </div>
                  <div className="shrink-0">{statusBadge(st)}</div>
                </div>
              </button>
            );
          })}
          <Card className="bg-white border-[#E5EBE7] shadow-xs">
            <CardContent className="pt-4 pb-4 text-xs text-[#718078]">
              Provider APIs block without partner approval — we never display “Connected” unless verified via test.
            </CardContent>
          </Card>
        </div>

        <div>
          {!selected ? (
            <Card className="p-8 text-center bg-white border-[#E5EBE7] shadow-xs">
              <Plug className="h-8 w-8 text-[#718078]/40 mx-auto" />
              <div className="mt-3 text-base font-bold text-[#172B25]">Select an integration to configure</div>
              <div className="text-xs text-[#718078] mt-1">View, configure, test connection, or disconnect anytime.</div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-left">
                <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3.5">
                  <b className="text-[#172B25]">Swiggy</b> — requires Partner API key + store ID + partner permissions.
                </div>
                <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3.5">
                  <b className="text-[#172B25]">Zomato</b> — requires Restaurant ID + API key + partner permissions.
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-white border-[#E5EBE7] shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#172B25] flex items-center justify-between">
                  <span>{meta?.name}</span>
                  <span>{statusBadge(statusMap(selected))}</span>
                </CardTitle>
                <p className="text-xs text-[#718078]">{meta?.description}</p>
                {meta?.docsUrl && (
                  <a href={meta.docsUrl} target="_blank" className="text-xs text-[#16845B] underline font-medium">
                    {meta.docsUrl}
                  </a>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {meta && meta.requiredFields.length===0 && (
                  <div className="rounded-xl bg-[#E8F5EE] border border-[#16845B]/30 p-3 text-sm text-[#16845B] font-medium">
                    No credentials required. This integration is ready — save to mark CONFIGURED, test to verify.
                  </div>
                )}
                {meta?.requiredFields.map(f=> (
                  <div key={f.key}>
                    <Label className="text-[#718078] text-xs font-semibold">{f.label} *</Label>
                    <Input
                      value={form[f.key] || ""}
                      onChange={e=>setForm({...form, [f.key]: e.target.value})}
                      placeholder={f.placeholder}
                      className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
                    />
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    onClick={save}
                    disabled={loading}
                    className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white shadow-xs"
                  >
                    <Check className="h-4 w-4 mr-1" /> Save as Configured
                  </Button>
                  <Button
                    onClick={test}
                    disabled={loading}
                    variant="outline"
                    className="rounded-full border-[#E5EBE7] bg-white text-[#172B25] hover:bg-[#F8FAF9]"
                  >
                    <TestTube className="h-4 w-4 mr-1" /> Test & verify
                  </Button>
                  <Button
                    onClick={disconnect}
                    disabled={loading}
                    variant="outline"
                    className="rounded-full border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <Unplug className="h-4 w-4 mr-1" /> Disconnect
                  </Button>
                </div>
                <div className="rounded-xl bg-[#F8FAF9] border border-[#E5EBE7] p-3 text-xs text-[#718078]">
                  <div className="font-bold text-[#172B25]">Honest Connection Statuses:</div>
                  <ul className="mt-1.5 space-y-1">
                    <li>• <b>NOT_CONNECTED</b> — no credentials stored</li>
                    <li>• <b>CONFIGURED</b> — credentials saved, awaiting test verification</li>
                    <li>• <b>CONNECTED</b> — test passed, sync enabled</li>
                    <li>• <b>ERROR</b> — test failed, check keys or partner permissions</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
