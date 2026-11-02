import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20",
        secondary: "bg-[#F0F4F2] text-[#172B25] border border-[#E5EBE7]",
        accent: "bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20",
        success: "bg-emerald-50 text-[#16845B] border border-emerald-200/80",
        warning: "bg-amber-50 text-amber-800 border border-amber-200",
        destructive: "bg-red-50 text-red-700 border border-red-200",
        muted: "bg-[#F8FAF9] text-[#718078] border border-[#E5EBE7]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
