"use client";

import React, { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ContactForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const fd = new FormData(e.currentTarget);
      const body = Object.fromEntries(fd.entries());
      const res = await apiFetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          restaurantName: (body as Record<string, string>).restaurantName || body.name,
          city: (body as Record<string, string>).city || "Vellore",
        }),
      });
      const j = await res.json();
      setStatus(j.ok ? "Thanks! Our restaurant team will contact you within 24 hours." : j.error || "Failed");
    } catch {
      setStatus("Network error. Please call or WhatsApp us directly.");
    } finally {
      setLoading(false);
    }
  }

  return (
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
          <Input name="phone" required placeholder="+91 9XXXXXXXXX" className="bg-white border-[#E5EBE7] text-[#172B25] placeholder:text-[#718078]/50" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-semibold text-[#718078] mb-1.5 block">Restaurant Name</Label>
          <Input name="restaurantName" required placeholder="Spice Route" className="bg-white border-[#E5EBE7] text-[#172B25] placeholder:text-[#718078]/50" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-[#718078] mb-1.5 block">City</Label>
          <Input name="city" required placeholder="Vellore" className="bg-white border-[#E5EBE7] text-[#172B25] placeholder:text-[#718078]/50" />
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-[#718078] mb-1.5 block">Message</Label>
        <Textarea name="message" rows={4} placeholder="How can our team help your business?" className="bg-white border-[#E5EBE7] text-[#172B25] placeholder:text-[#718078]/50" />
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="rounded-full bg-[#16845B] hover:bg-[#116B49] text-white w-full sm:w-auto px-8 py-2.5 font-bold shadow-xs disabled:opacity-50"
      >
        {loading ? "Sending..." : "Send message"}
      </Button>
      {status && (
        <div className="text-sm p-3 rounded-xl bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20 font-medium">
          {status}
        </div>
      )}
    </form>
  );
}
