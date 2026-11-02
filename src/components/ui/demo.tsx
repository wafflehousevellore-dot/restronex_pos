"use client";

import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "FREE",
    price: "$0",
    description: "Start exploring and organizing your projects with essential tools.",
    features: [
      "Access to essential workspace features",
      "Upload files up to 50MB",
      "Real-time notifications",
      "Single-user setup",
    ],
    cta: "GET STARTED FOR FREE",
  },
  {
    name: "PRO",
    price: "$299",
    description: "Unlock advanced collaboration tools and priority performance.",
    features: [
      "Unlimited customizable boards",
      "Smart activity feeds and history",
      "Upload files up to 1GB",
      "Instant push notifications",
      "Shared workspaces for small teams",
    ],
    cta: "UPGRADE TO PRO",
    featured: true,
  },
  {
    name: "ENTERPRISE",
    price: "CUSTOM",
    description: "Custom plans tailored to large organizations with complex needs.",
    features: [
      "Unlimited workspace scaling",
      "Smart automations and reporting",
      "Unlimited file uploads",
      "Enterprise security and controls",
      "Dedicated account management",
      "Custom SLA agreements",
    ],
    cta: "CONTACT US",
  },
];

export default function PricingSection() {
  return (
    <div className="min-h-screen bg-[#F8FAF9] px-4 text-[#172B25]">
      <div className="mx-auto max-w-6xl py-16 sm:py-20">
        <div className="mb-10 grid grid-cols-1 items-center gap-6 px-4 md:grid-cols-12 md:px-10">
          <div className="md:col-span-8">
            <p className="mb-4 w-fit rounded-full border border-[#16845B]/20 bg-[#E8F5EE] px-3.5 py-1 text-xs font-semibold tracking-wide text-[#16845B]">
              SIMPLE, SCALABLE PRICING
            </p>
            <h2 className="text-3xl font-black tracking-tight text-[#172B25] md:text-5xl">
              Plans that fit your <span className="text-[#718078]">growth</span>
            </h2>
            <p className="mt-3 text-sm text-[#718078] max-w-xl">
              Transparent tiers tailored for modern SaaS and dining operations.
            </p>
          </div>
          <div className="md:col-span-4 md:mt-auto">
            <div className="flex items-center gap-2 text-xs text-[#718078]">
              <Sparkles className="h-3.5 w-3.5 text-[#16845B]" /> Trusted by industry leaders
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-6 flex flex-col justify-between ${
                tier.featured
                  ? "border-2 border-[#16845B] bg-[#E8F5EE]/40 shadow-md"
                  : "border-[#E5EBE7] bg-white shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-black ${tier.featured ? "text-[#16845B]" : "text-[#172B25]"}`}>
                    {tier.name}
                  </h3>
                  {tier.featured && (
                    <span className="rounded-full bg-[#16845B] text-white text-[10px] font-bold px-2.5 py-0.5">
                      POPULAR
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-[#718078]">{tier.description}</p>
                <div className="mt-4 text-3xl font-black text-[#172B25]">{tier.price}</div>
                <ul className="mt-6 space-y-2.5 text-xs text-[#718078]">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#16845B] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                className={`mt-8 w-full rounded-full py-5 text-xs font-bold ${
                  tier.featured
                    ? "bg-[#16845B] hover:bg-[#116B49] text-white"
                    : "bg-[#172B25] hover:bg-black text-white"
                }`}
              >
                {tier.cta} <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
