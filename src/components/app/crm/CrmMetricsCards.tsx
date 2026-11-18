"use client";

import React from "react";
import { Users, Award, Coins, TrendingUp, MessageSquare, CheckCircle2 } from "lucide-react";

interface CrmMetricsCardsProps {
  metrics?: {
    totalCustomers: number;
    activeLoyaltyMembers: number;
    totalPointsInCirculation: number;
    totalRevenuePaise: number;
    averageOrderValuePaise: number;
    repeatCustomerRate: number;
    marketingOptInRate: number;
    repeatCustomersCount: number;
    marketingOptInCount: number;
  };
  feedbackMetrics?: {
    avgRating: string;
    npsScore: number;
    csatPercent: number;
    unresolvedCount: number;
  };
}

export function CrmMetricsCards({ metrics, feedbackMetrics }: CrmMetricsCardsProps) {
  const m = metrics || {
    totalCustomers: 0,
    activeLoyaltyMembers: 0,
    totalPointsInCirculation: 0,
    totalRevenuePaise: 0,
    averageOrderValuePaise: 0,
    repeatCustomerRate: 0,
    marketingOptInRate: 0,
    repeatCustomersCount: 0,
    marketingOptInCount: 0,
  };

  const fb = feedbackMetrics || {
    avgRating: "5.0",
    npsScore: 100,
    csatPercent: 100,
    unresolvedCount: 0,
  };

  const cards = [
    {
      title: "Total Customer Base",
      value: m.totalCustomers.toLocaleString(),
      subtext: `${m.repeatCustomersCount} repeat diners (${m.repeatCustomerRate}%)`,
      icon: Users,
      color: "text-[#16845B]",
      bg: "bg-[#E8F5EE]",
    },
    {
      title: "Active Loyalty Members",
      value: m.activeLoyaltyMembers.toLocaleString(),
      subtext: `${m.totalCustomers > 0 ? Math.round((m.activeLoyaltyMembers / m.totalCustomers) * 100) : 0}% enrolled with active balance`,
      icon: Award,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Points in Circulation",
      value: m.totalPointsInCirculation.toLocaleString(),
      subtext: `Worth ₹${m.totalPointsInCirculation.toLocaleString()} in diner credit`,
      icon: Coins,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      title: "Average Order Value",
      value: `₹${Math.round(m.averageOrderValuePaise / 100).toLocaleString()}`,
      subtext: `From ₹${Math.round(m.totalRevenuePaise / 100).toLocaleString()} customer spend`,
      icon: TrendingUp,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Guest CSAT & NPS",
      value: `${fb.csatPercent}% CSAT`,
      subtext: `+${fb.npsScore} NPS • ★ ${fb.avgRating} / 5.0`,
      icon: MessageSquare,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Marketing Consent Rate",
      value: `${m.marketingOptInRate}%`,
      subtext: `${m.marketingOptInCount} diners opted in for WhatsApp promos`,
      icon: CheckCircle2,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="rounded-2xl border border-[#E5EBE7] bg-white p-4 shadow-xs transition hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#718078]">
                {card.title}
              </span>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="mt-2 text-xl font-black text-[#172B25]">{card.value}</div>
            <p className="mt-1 text-[11px] font-medium text-[#718078] truncate">{card.subtext}</p>
          </div>
        );
      })}
    </div>
  );
}
