import React from "react";
import Image from "next/image";
import { Star, Award, ShieldCheck, HeartHandshake, Quote } from "lucide-react";

export default function IndustryRatingsSection() {
  const reviews = [
    {
      platform: "Google Customer Reviews",
      score: "4.8",
      max: "5.0",
      count: "12,400+ Restaurateurs",
      badge: "Highest Customer Satisfaction",
      icon: Star,
    },
    {
      platform: "SoftwareSuggest Awards",
      score: "4.9",
      max: "5.0",
      count: "Best Support & Usability",
      badge: "Leader in Restaurant POS",
      icon: Award,
    },
    {
      platform: "Capterra Hospitality",
      score: "4.9",
      max: "5.0",
      count: "Top Enterprise Reliability",
      badge: "Zero-Downtime Verified",
      icon: ShieldCheck,
    },
    {
      platform: "G2 Crowd Leader",
      score: "4.8",
      max: "5.0",
      count: "Fastest Implementation",
      badge: "Top Restaurant Software",
      icon: HeartHandshake,
    },
  ];

  const testimonials = [
    {
      quote:
        "Switching to RestroNex completely transformed our dinner rush. Cashiers punch bills in 3 seconds, KOTs hit the tandoor and curry stations instantaneously, and our raw ingredient inventory variance dropped under 1.5%.",
      author: "Vikramaditya S.",
      role: "Director",
      restaurant: "Spice Odyssey Bistro",
      location: "Bangalore",
      tags: ["Fine Dine", "Multi-KOT"],
    },
    {
      quote:
        "Managing 14 outlets across Mumbai used to take half my day. With RestroNex's central cloud dashboard, I can update menu pricing, push seasonal combos, and audit day-end cash drawers across all branches right from my phone.",
      author: "Ananya Roy",
      role: "Co-Founder & COO",
      restaurant: "The Artisan Crust Pizzeria",
      location: "Mumbai",
      tags: ["14 Outlets", "Central Menu"],
    },
    {
      quote:
        "The automated WhatsApp invoice delivery alone saved us ₹18,000 every single month on thermal paper rolls, while our customers love having their itemized GST receipt stored neatly on their phones without paper clutter.",
      author: "Rohan Deshmukh",
      role: "Head of Operations",
      restaurant: "Urban Keventers & Brews",
      location: "Pune",
      tags: ["QSR & Cafe", "WhatsApp Invoices"],
    },
  ];

  return (
    <section className="py-20 bg-[#F8FAF9] border-b border-[#E5EBE7]">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20">
            INDUSTRY RATINGS & TESTIMONIALS
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black text-[#172B25] tracking-tight">
            Loved by 1,00,000+ Restaurateurs Across India
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#718078] leading-relaxed">
            From single-counter street cafes to multi-city hospitality franchises, see why food leaders count on RestroNex every single day.
          </p>
        </div>

        {/* Rating Badges Grid */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {reviews.map((rev, idx) => {
            const Icon = rev.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white border border-[#E5EBE7] shadow-2xs hover:border-[#16845B]/30 hover:shadow-xs transition text-center flex flex-col justify-between"
              >
                <div>
                  <div className="inline-flex p-2.5 rounded-xl bg-[#E8F5EE] text-[#16845B] mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-center gap-1 text-amber-500 mb-1.5">
                    {[...Array(5)].map((_, sIdx) => (
                      <Star key={sIdx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <div className="text-2xl font-black text-[#172B25]">
                    {rev.score}
                    <span className="text-xs text-[#718078] font-normal"> / {rev.max}</span>
                  </div>
                  <div className="text-xs font-bold text-[#172B25] mt-1">{rev.platform}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#E5EBE7] text-[11px] text-[#718078]">
                  {rev.count}
                </div>
              </div>
            );
          })}
        </div>

        {/* Client Testimonial Cards */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white border border-[#E5EBE7] shadow-2xs hover:border-[#16845B] hover:shadow-sm transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Quote className="h-8 w-8 text-[#16845B]/30" />
                  <div className="flex gap-1.5">
                    {t.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[10px] font-bold text-[#16845B] bg-[#E8F5EE] px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs sm:text-[13px] text-[#172B25] leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E5EBE7] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#172B25]">{t.author}</div>
                  <div className="text-[11px] text-[#718078]">
                    {t.role}, <span className="font-semibold text-[#172B25]">{t.restaurant}</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#16845B] bg-[#E8F5EE] px-2.5 py-1 rounded-md">
                  {t.location}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
