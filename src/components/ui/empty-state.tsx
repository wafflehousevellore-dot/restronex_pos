"use client";

import * as React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-[#E5EBE7] bg-white text-center flex flex-col items-center justify-center",
        compact ? "py-8 px-4" : "py-14 px-6",
        className
      )}
      {...props}
    >
      <div className="h-12 w-12 rounded-2xl bg-[#E8F5EE] border border-[#16845B]/15 flex items-center justify-center text-[#16845B] mb-3.5 shadow-2xs">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-base font-bold text-[#172B25] max-w-md">{title}</h3>

      {description && (
        <p className="mt-1 text-xs sm:text-sm text-[#718078] max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
