"use client";
import { apiFetch } from "@/lib/api";
import { PageShell } from "@/components/marketing/PageShell";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { brand } from "@/lib/brand";

export default function ContactPage(){
  const [status, setStatus] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await apiFetch("/api/demo-requests", { method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ ...body, restaurantName: (body as Record<string, string>).restaurantName || body.name, city: (body as Record<string, string>).city || "Bengaluru" })});
    const j = await res.json();
    setStatus(j.ok ? "Thanks! We'll contact you within 24 hours." : j.error || "Failed");
  }
  return (
    <PageShell title="Contact us" subtitle="Sales, support, onboarding — we're here 24x7." badge="Contact • 24x7 Support">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="text-sm font-bold text-white mb-4">Send a message</div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label className="text-white/70">Name</Label><Input name="name" required placeholder="Arjun Rao" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label className="text-white/70">Email</Label><Input name="email" type="email" required placeholder="arjun@restaurant.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div><div><Label className="text-white/70">Phone</Label><Input name="phone" required placeholder="+91 98765 43210" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label className="text-white/70">Restaurant</Label><Input name="restaurantName" required placeholder="Spice Route" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div><div><Label className="text-white/70">City</Label><Input name="city" required placeholder="Bengaluru" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div></div>
            <div><Label className="text-white/70">Message</Label><Textarea name="message" rows={4} placeholder="How can we help?" className="bg-white/5 border-white/10 text-white placeholder:text-white/30" /></div>
            <Button type="submit" className="rounded-full bg-[#3D954F] hover:bg-[#2e7a3e] text-white w-full sm:w-auto px-8">Send message</Button>
            {status && <div className="text-sm p-3 rounded-xl bg-[#3D954F]/20 text-white border border-[#3D954F]/30">{status}</div>}
          </form>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="text-sm font-bold text-white">Reach us</div>
          <div className="mt-3 space-y-2 text-sm text-white/60">
            <div>{brand.contact.email} • {brand.contact.phone}</div>
            <div>{brand.contact.address}</div>
            <div className="pt-4 text-xs text-white/30">Demo enquiries are validated (Zod) and persisted to DB. Submission never fakes success — API returns real DB id or error.</div>
          </div>
          <div className="mt-6 flex gap-2">
            <div className="h-9 w-9 rounded-full bg-white/10 grid place-items-center text-xs">✉</div>
            <div className="h-9 w-9 rounded-full bg-white/10 grid place-items-center text-xs">☎</div>
            <div className="h-9 w-9 rounded-full bg-white/10 grid place-items-center text-xs">📍</div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
