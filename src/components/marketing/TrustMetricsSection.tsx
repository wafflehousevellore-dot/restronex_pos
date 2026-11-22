import { Users, Receipt, ShieldCheck, Clock, Award, Star } from "lucide-react";

export default function TrustMetricsSection() {
  const metrics = [
    {
      value: "1,00,000+",
      label: "Dining Outlets & Counters",
      sublabel: "Active across India & global markets",
      icon: Users,
    },
    {
      value: "60 Lakh+",
      label: "Bills Processed Daily",
      sublabel: "High-speed counter checkout without lag",
      icon: Receipt,
    },
    {
      value: "0%",
      label: "Processing Errors",
      sublabel: "Exact paise integer tax & ledger math",
      icon: ShieldCheck,
    },
    {
      value: "99.99%",
      label: "Cloud Uptime & Offline",
      sublabel: "Keep billing even when internet drops",
      icon: Clock,
    },
  ];

  const brandShowcase = [
    "Haldiram's Style Outlets",
    "La Pino'z Pizzerias",
    "Star Biryani Hubs",
    "Jumboking QSR Chains",
    "Chai Point Cafes",
    "Bikanervala Counters",
    "Naturals Ice Cream Stores",
    "The Belgian Waffle Counters",
  ];

  return (
    <section className="py-14 sm:py-16 bg-[#F8FAF9] border-b border-[#E5EBE7]">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        {/* Brand Banner */}
        <div className="text-center max-w-xl mx-auto">
          <span className="text-xs font-bold tracking-widest text-[#16845B] uppercase">
            HOW WE BUILD TRUST
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black text-[#172B25]">
            Amplifying The Key Metrics That Matter
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#718078]">
            Built by restaurant technologists for real rush hours, zero tolerance for error, and seamless scale.
          </p>
        </div>

        {/* 4 Metric Cards */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {metrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E5EBE7] shadow-xs text-center space-y-2 hover:border-[#16845B] transition-colors"
              >
                <div className="h-10 w-10 rounded-2xl bg-[#E8F5EE] text-[#16845B] mx-auto grid place-items-center">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#172B25] tracking-tight">
                  {m.value}
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#172B25]">{m.label}</div>
                <div className="text-[11px] text-[#718078] leading-snug">{m.sublabel}</div>
              </div>
            );
          })}
        </div>

        {/* Brand Carousel Pill List */}
        <div className="mt-10 pt-8 border-t border-[#E5EBE7]">
          <div className="text-center text-xs font-semibold text-[#718078] uppercase tracking-wider mb-4">
            Trusted by independent dining rooms, QSR leaders & high-volume food franchises
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {brandShowcase.map((b, idx) => (
              <span
                key={idx}
                className="px-4 py-2 rounded-full bg-white border border-[#E5EBE7] text-xs font-bold text-[#172B25] shadow-2xs hover:border-[#16845B] transition-colors"
              >
                ✓ {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
