"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusVariant =
  | "success"
  | "warning"
  | "info"
  | "destructive"
  | "neutral"
  | "purple";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  label?: string;
  variant?: StatusVariant;
  pulse?: boolean;
  size?: "sm" | "md";
}

function resolveStatusVariant(status: string): { variant: StatusVariant; defaultPulse: boolean } {
  const normalized = status.toUpperCase().replace(/\s+/g, "_");

  switch (normalized) {
    case "ACTIVE":
    case "PAID":
    case "COMPLETED":
    case "DELIVERED":
    case "SERVED":
    case "READY":
    case "IN_STOCK":
    case "VERIFIED":
    case "SUCCESS":
    case "ONLINE":
    case "LIVE":
      return { variant: "success", defaultPulse: false };

    case "PREPARING":
    case "KITCHEN":
    case "PENDING":
    case "IN_PROGRESS":
    case "PARTIAL":
    case "LOW_STOCK":
    case "OCCUPIED":
    case "BILLED":
    case "TRIAL":
    case "DUE":
      return { variant: "warning", defaultPulse: ["PREPARING", "PENDING"].includes(normalized) };

    case "CONFIRMED":
    case "ACCEPTED":
    case "OUT_FOR_DELIVERY":
    case "NEW":
    case "INFO":
    case "SCHEDULED":
    case "RESERVED":
    case "CONNECTING":
      return { variant: "info", defaultPulse: normalized === "OUT_FOR_DELIVERY" };

    case "CANCELLED":
    case "FAILED":
    case "REJECTED":
    case "OUT_OF_STOCK":
    case "SUSPENDED":
    case "EXPIRED":
    case "OVERDUE":
    case "ERROR":
      return { variant: "destructive", defaultPulse: false };

    case "PRO":
    case "ENTERPRISE":
    case "VIP":
      return { variant: "purple", defaultPulse: false };

    case "INACTIVE":
    case "DRAFT":
    case "VACANT":
    case "CLOSED":
    case "CLEANING":
    case "ARCHIVED":
    default:
      return { variant: "neutral", defaultPulse: false };
  }
}

const variantStyles: Record<StatusVariant, { badge: string; dot: string }> = {
  success: {
    badge: "bg-[#E8F5EE] text-[#16845B] border-[#16845B]/20",
    dot: "bg-[#16845B]",
  },
  warning: {
    badge: "bg-amber-50 text-amber-800 border-amber-200/80",
    dot: "bg-amber-500",
  },
  info: {
    badge: "bg-sky-50 text-sky-800 border-sky-200/80",
    dot: "bg-sky-500",
  },
  destructive: {
    badge: "bg-red-50 text-red-700 border-red-200/80",
    dot: "bg-red-500",
  },
  purple: {
    badge: "bg-purple-50 text-purple-800 border-purple-200/80",
    dot: "bg-purple-500",
  },
  neutral: {
    badge: "bg-[#F0F4F2] text-[#718078] border-[#E5EBE7]",
    dot: "bg-[#A0ACA5]",
  },
};

export function StatusBadge({
  status,
  label,
  variant: explicitVariant,
  pulse: explicitPulse,
  size = "md",
  className,
  ...props
}: StatusBadgeProps) {
  const resolved = resolveStatusVariant(status);
  const variant = explicitVariant || resolved.variant;
  const showPulse = explicitPulse !== undefined ? explicitPulse : resolved.defaultPulse;
  const style = variantStyles[variant];

  const displayLabel =
    label ||
    status
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold border tracking-wide transition-colors whitespace-nowrap",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        style.badge,
        className
      )}
      {...props}
    >
      <span className="relative flex h-1.5 w-1.5">
        {showPulse && (
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              style.dot
            )}
          />
        )}
        <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", style.dot)} />
      </span>
      <span>{displayLabel}</span>
    </span>
  );
}
