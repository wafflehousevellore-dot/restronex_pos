import * as React from "react";
import { cn } from "@/lib/utils";

// RestroNex Light Theme Card — Soft borders, pure white surface, subtle elevation
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#E5EBE7] bg-white text-[#172B25] shadow-xs hover:shadow-sm transition-shadow",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pb-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-bold tracking-tight text-[#172B25]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[#718078] mt-1 leading-relaxed", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0 text-[#172B25]", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0 border-t border-[#E5EBE7]/60 mt-4", className)} {...props} />;
}

// Aliases for full backward compatibility across all legacy imports
export const DarkCard = Card;
export const DarkCardHeader = CardHeader;
export const DarkCardTitle = CardTitle;
export const DarkCardContent = CardContent;
