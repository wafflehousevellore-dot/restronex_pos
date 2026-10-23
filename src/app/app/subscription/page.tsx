"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, DarkCard, DarkCardContent, DarkCardHeader, DarkCardTitle, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/money";
export default function SubscriptionPage(){
  const [plans,setPlans]=useState<any[]>([]);
  useEffect(()=>{ apiFetch("/api/subscription-plans").then(r=>r.json()).then(setPlans).catch(()=>{}); },[]);
  return (
    <div className="space-y-6 text-white">
      <h1 className="text-xl font-black text-white">Subscription & Billing</h1>
      <Card><CardContent className="pt-6 text-sm text-white/70">Plans are configurable in DB, not hardcoded. Entitlements derived from Subscription → Plan. Razorpay webhooks verify signature, are idempotent, and gate features server-side. Failed payments set PAST_DUE; browser success never unlocks features.</CardContent></Card>
      <div className="grid sm:grid-cols-3 gap-4">
        {plans.length ? plans.map((p:any)=> <Card key={p.id} className={p.slug==="growth"?"border-orange-200 ring-1 ring-orange-100":""}><CardHeader><CardTitle>{p.name}</CardTitle><div className="text-sm text-white/50">{formatINR(p.priceMonthlyPaise)}/mo • {p.maxOutlets} outlets</div></CardHeader><CardContent><Button className={`w-full rounded-full ${p.slug==="growth"?"bg-[#3D954F] hover:bg-[#2e7a3e] text-white":"border border-white/15 bg-white/5 text-white hover:bg-white/10"}`}>Choose {p.name}</Button></CardContent></Card>) : <Card><CardContent className="pt-6 text-sm text-white/50">Loading plans… (seeded Starter/Growth/Enterprise in DB)</CardContent></Card>}
      </div>
    </div>
  );
}
