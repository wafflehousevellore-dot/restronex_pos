"use client";
import { PageShell } from "@/components/marketing/PageShell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useState } from "react";

export default function BookDemo(){
  const [status,setStatus]=useState<string|null>(null);
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/demo-requests",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body)});
    const j = await res.json();
    if(res.ok) setStatus("Demo request received! Our solution architect will call you within 2 business hours.");
    else setStatus(j.error || "Failed");
  }
  return (
    <PageShell title="Schedule a live demo" subtitle="Walk through billing, KOT, inventory, and reports with our solution architects." badge="Personalized • 30 mins">
      <div className="rounded-2xl border border-[#E5EBE7] bg-white p-8 max-w-2xl shadow-xs">
        <div className="text-base font-bold text-[#172B25] mb-4">Request your demo</div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <Label className="text-[#718078] text-xs font-semibold">Name</Label>
              <Input name="name" required placeholder="Priya Singh" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"/>
            </div>
            <div>
              <Label className="text-[#718078] text-xs font-semibold">Phone</Label>
              <Input name="phone" required placeholder="+91 98765 43210" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"/>
            </div>
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Business Email</Label>
            <Input name="email" type="email" required placeholder="priya@restaurant.com" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"/>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <Label className="text-[#718078] text-xs font-semibold">Restaurant Name</Label>
              <Input name="restaurantName" required placeholder="The Chaat House" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"/>
            </div>
            <div>
              <Label className="text-[#718078] text-xs font-semibold">City</Label>
              <Input name="city" required placeholder="Mumbai" className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"/>
            </div>
          </div>
          <div>
            <Label className="text-[#718078] text-xs font-semibold">Message (optional)</Label>
            <Textarea name="message" rows={3} placeholder="Tell us about your outlets, challenges..." className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"/>
          </div>
          <Button type="submit" className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white px-8 py-2.5 font-bold shadow-xs">
            Request Demo
          </Button>
          {status && (
            <div className="text-sm p-3.5 rounded-xl bg-[#E8F5EE] border border-[#16845B]/30 text-[#16845B] font-medium">
              {status}
            </div>
          )}
        </form>
      </div>
    </PageShell>
  );
}
