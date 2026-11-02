import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-800 text-slate-100 border border-slate-700",
        secondary: "bg-slate-800/80 text-slate-300 border border-slate-700",
        accent: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        destructive: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
        muted: "bg-slate-800/50 text-slate-400 border border-slate-700/50",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
