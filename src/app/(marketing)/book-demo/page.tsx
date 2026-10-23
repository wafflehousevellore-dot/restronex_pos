"use client";
import { apiFetch } from "@/lib/api";
import { PageShell } from "@/components/marketing/PageShell";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function BookDemo(){
  const [status,setStatus]=useState<string|null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const body=Object.fromEntries(fd.entries());
    const res=await apiFetch("/api/demo-requests",{method:"POST", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(body)});
    const j=await res.json();
    setStatus(j.ok ? `Demo requested! Reference ${j.id}. Our team will reach out in 24h.` : j.error||"Failed");
  }
  return (
    <PageShell title="Book a Demo" subtitle="See RestroNex live with your menu and outlets. 30-minute walkthrough." badge="Live Demo • 30 mins">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur max-w-2xl">
        <div className="text-sm font-bold text-white mb-4">Request your demo</div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3"><div><Label className="text-white/70">Name</Label><Input name="name" required placeholder="Priya Singh" className="bg-white/5 border-white/10 text-white placeholder:text-white/30"/></div><div><Label className="text-white/70">Phone</Label><Input name="phone" required placeholder="+91 98765 43210" className="bg-white/5 border-white/10 text-white placeholder:text-white/30"/></div></div>
          <div><Label className="text-white/70">Email</Label><Input name="email" type="email" required placeholder="priya@restaurant.com" className="bg-white/5 border-white/10 text-white placeholder:text-white/30"/></div>
          <div className="grid grid-cols-2 gap-3"><div><Label className="text-white/70">Restaurant</Label><Input name="restaurantName" required placeholder="The Chaat House" className="bg-white/5 border-white/10 text-white placeholder:text-white/30"/></div><div><Label className="text-white/70">City</Label><Input name="city" required placeholder="Mumbai" className="bg-white/5 border-white/10 text-white placeholder:text-white/30"/></div></div>
          <div><Label className="text-white/70">Message (optional)</Label><Textarea name="message" rows={3} placeholder="Tell us about your outlets, challenges..." className="bg-white/5 border-white/10 text-white placeholder:text-white/30"/></div>
          <Button type="submit" className="rounded-full bg-[#3D954F] hover:bg-[#2e7a3e] text-white px-8">Request demo</Button>
          {status && <div className="text-sm p-3 rounded-xl bg-[#070B07] border border-white/10 text-white">{status}</div>}
        </form>
      </div>
    </PageShell>
  );
}
