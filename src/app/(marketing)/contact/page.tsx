"use client";
import { apiFetch } from "@/lib/api";
import { PageShell } from "@/components/marketing/PageShell";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { brand } from "@/lib/brand";

export default function ContactPage() {
  const [status, setStatus] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await apiFetch("/api/demo-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        restaurantName: (body as Record<string, string>).restaurantName || body.name,
        city: (body as Record<string, string>).city || "Bengaluru",
      }),
    });
    const j = await res.json();
    setStatus(j.ok ? "Thanks! We'll contact you within 24 hours." : j.error || "Failed");
  }

  return (
    <PageShell title="Contact us" subtitle="Sales, support, onboarding — we're here 24x7." badge="Contact • 24x7 Support">
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs">
          <div className="text-base font-bold text-[#172B25] mb-4">Send a message</div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-[#718078] mb-1.5 block">Full Name</Label>
              <Input name="name" required placeholder="Arjun Rao" className="bg-white border-[#E5EBE7] text-[#172B25] placeholder:text-[#718078]/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-[#718078] mb-1.5 block">Email Address</Label>
                <Input name="email" type="email" required placeholder="arjun@restaurant.com" className="bg-white border-[#E5EBE7] text-[#172B25] placeholder:text-[#718078]/50" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#718078] mb-1.5 block">Phone Number</Label>
                <Input name="phone" required placeholder="+91 98765 43210" className="bg-white border-[#E5EBE7] text-[#172B25] placeholder:text-[#718078]/50" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-[#718078] mb-1.5 block">Restaurant Name</Label>
                <Input name="restaurantName" required placeholder="Spice Route" className="bg-white border-[#E5EBE7] text-[#172B25] placeholder:text-[#718078]/50" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-[#718078] mb-1.5 block">City</Label>
                <Input name="city" required placeholder="Bengaluru" className="bg-white border-[#E5EBE7] text-[#172B25] placeholder:text-[#718078]/50" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#718078] mb-1.5 block">Message</Label>
              <Textarea name="message" rows={4} placeholder="How can our team help your business?" className="bg-white border-[#E5EBE7] text-[#172B25] placeholder:text-[#718078]/50" />
            </div>
            <Button type="submit" className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white w-full sm:w-auto px-8 py-2.5 font-bold shadow-xs">
              Send message
            </Button>
            {status && (
              <div className="text-sm p-3 rounded-xl bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20 font-medium">
                {status}
              </div>
            )}
          </form>
        </div>

        <div className="rounded-2xl border border-[#E5EBE7] bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-base font-bold text-[#172B25]">Reach us directly</div>
            <p className="mt-1 text-sm text-[#718078]">Connect with our restaurant onboarding team anytime.</p>
            
            <div className="mt-6 space-y-4 text-sm text-[#172B25]">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] text-[#16845B] flex items-center justify-center text-sm font-bold shrink-0">✉</div>
                <div>
                  <div className="font-semibold text-xs text-[#718078] uppercase tracking-wider">Email</div>
                  <div className="font-medium text-[#172B25]">{brand.contact.email}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] text-[#16845B] flex items-center justify-center text-sm font-bold shrink-0">☎</div>
                <div>
                  <div className="font-semibold text-xs text-[#718078] uppercase tracking-wider">Phone</div>
                  <div className="font-medium text-[#172B25]">{brand.contact.phone}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#E8F5EE] text-[#16845B] flex items-center justify-center text-sm font-bold shrink-0">📍</div>
                <div>
                  <div className="font-semibold text-xs text-[#718078] uppercase tracking-wider">Office</div>
                  <div className="font-medium text-[#172B25]">{brand.contact.address}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#E5EBE7] text-xs text-[#718078] leading-relaxed">
            RestroNex operations and support engineers are based in Bengaluru, serving high-volume dining, cafe, and QSR venues across India.
          </div>
        </div>
      </div>
    </PageShell>
  );
}
