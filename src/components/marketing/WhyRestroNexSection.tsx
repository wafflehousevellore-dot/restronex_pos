import React from "react";
import Link from "next/link";
import { Sparkles, ShieldCheck, MousePointerClick, Headphones, ArrowRight, Check } from "lucide-react";

export default function WhyRestroNexSection() {
  const pillars = [
    {
      icon: Sparkles,
      tag: "Continuous Innovation",
      title: "Non-Disruptive Cloud Innovation",
      desc: "Weekly platform upgrades, auto cloud backups, and sub-second offline sync. Your POS never goes down, even during peak rush hours or intermittent internet drops.",
      points: [
        "Sub-second offline local sync",
        "Weekly automated feature updates",
        "Zero-downtime cloud architecture",
      ],
      badge: "Zero Downtime",
    },
    {
      icon: ShieldCheck,
      tag: "Transparent Pricing",
      title: "Fair, Predictable & Transparent Pricing",
      desc: "Industry-friendly flat pricing designed to scale your business. No per-bill commissions, no hidden transaction cuts, and no lock-in surprise penalties.",
      points: [
        "Zero per-bill commission fees",
        "Flat monthly or annual billing",
        "Full data ownership & exportable logs",
      ],
      badge: "No Hidden Costs",
    },
    {
      icon: MousePointerClick,
      tag: "Simplicity First",
      title: "15-Minute Staff Onboarding Curve",
      desc: "Intuitive touch design crafted for busy cashiers and captains. Onboard new staff in 15 minutes with high-contrast layouts, custom shortcuts, and 3-tap checkout.",
      points: [
        "3-click rapid bill settlement",
        "High-contrast kitchen & counter layouts",
        "Keyboard shortcut speed-billing",
      ],
      badge: "3-Click Flow",
    },
    {
      icon: Headphones,
      tag: "24x7 Support",
      title: "Round-the-Clock Priority Support",
      desc: "Our restaurant operations engineers are on standby 24 hours a day, 7 days a week. Connect via direct phone line, WhatsApp, or instant screen sharing.",
      points: [
        "Under 2-minute average phone SLA",
        "Dedicated account onboarding manager",
        "Emergency on-call technical desk",
      ],
      badge: "24x7 Live Desk",
    },
  ];

  return (
    <section className="py-20 bg-white border-b border-[#E5EBE7]">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20">
            WHY RESTAURATEURS CHOOSE US
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#172B25] tracking-tight">
            Simplicity Meets Operational Excellence
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#718078] leading-relaxed">
            We engineer software that runs silently and reliably during Friday night rushes, reducing human error to 0% and giving owners complete visibility across their enterprise.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="relative rounded-3xl bg-[#F8FAF9] border border-[#E5EBE7] p-6 hover:border-[#16845B] hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="h-12 w-12 rounded-2xl bg-[#E8F5EE] text-[#16845B] flex items-center justify-center group-hover:bg-[#16845B] group-hover:text-white transition-colors duration-300">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-bold text-[#16845B] bg-white border border-[#E5EBE7] px-2.5 py-1 rounded-full">
                      {pillar.badge}
                    </span>
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider text-[#16845B]">
                    {pillar.tag}
                  </span>
                  <h3 className="text-lg font-bold text-[#172B25] mt-1 leading-snug">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-[#718078] mt-2.5 leading-relaxed">
                    {pillar.desc}
                  </p>

                  <div className="mt-4 pt-4 border-t border-[#E5EBE7] space-y-2">
                    {pillar.points.map((pt, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-2 text-[11px] font-medium text-[#172B25]">
                        <Check className="h-3.5 w-3.5 text-[#16845B] shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-3">
                  <Link
                    href="/book-demo"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16845B] hover:text-[#116B49] transition-colors"
                  >
                    <span>Learn how it works</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
