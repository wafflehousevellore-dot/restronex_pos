"use client";
import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/money";
import Link from "next/link";

export default function SubscriptionPage(){
  const [plans,setPlans]=useState<any[]>([]);

  useEffect(()=>{
    apiFetch("/api/subscription-plans").then(r=>r.json()).then(setPlans).catch(()=>{});
  },[]);

  return (
    <div className="space-y-6 text-[#172B25]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Subscription & Plans</h1>
          <p className="text-sm text-[#718078]">Server-verified entitlements derived dynamically from active database plans.</p>
        </div>
        <Link
          href="/checkout"
          className="rounded-full bg-[#16845B] text-white px-5 py-2 text-xs font-bold hover:bg-[#116B49] shadow-xs transition"
        >
          Checkout Gateway →
        </Link>
      </div>

      <Card className="bg-white border-[#E5EBE7] shadow-xs">
        <CardContent className="pt-6 text-sm text-[#718078] leading-relaxed">
          Subscription tiers are managed dynamically in PostgreSQL. Razorpay signatures are verified server-side with HMAC-SHA256 and idempotently deduplicated.
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-3 gap-6">
        {plans.length ? (
          plans.map((p:any)=> {
            const isFeatured = p.slug === "growth";
            return (
              <Card
                key={p.id}
                className={`bg-white border transition shadow-xs ${
                  isFeatured
                    ? "border-2 border-[#16845B] shadow-md ring-4 ring-[#16845B]/10 relative"
                    : "border-[#E5EBE7] hover:shadow-sm"
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#16845B] px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Recommended
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-[#172B25] text-lg">{p.name}</CardTitle>
                  <div className="text-xs text-[#718078] mt-1">
                    {formatINR(p.priceMonthlyPaise)}/mo • {p.maxOutlets} outlets • {p.maxUsers} staff
                  </div>
                </CardHeader>
                <CardContent>
                  <Link href={`/checkout?plan=${p.slug}`}>
                    <Button
                      className={`w-full rounded-full text-xs font-bold py-2.5 transition ${
                        isFeatured
                          ? "bg-[#16845B] hover:bg-[#116B49] text-white shadow-xs"
                          : "border border-[#E5EBE7] bg-[#F8FAF9] text-[#172B25] hover:bg-white"
                      }`}
                    >
                      Choose {p.name}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full p-8 text-center bg-white border-[#E5EBE7]">
            <CardContent className="text-sm text-[#718078]">Loading subscription plans…</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
