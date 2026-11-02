import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-xl border border-[#E5EBE7] bg-white px-3.5 py-2 text-sm text-[#172B25] placeholder-[#A0ACA5] shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B]/20 focus-visible:border-[#16845B] disabled:cursor-not-allowed disabled:opacity-50 transition-all",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[80px] w-full rounded-xl border border-[#E5EBE7] bg-white px-3.5 py-2 text-sm text-[#172B25] placeholder-[#A0ACA5] shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B]/20 focus-visible:border-[#16845B] disabled:cursor-not-allowed transition-all",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-xs font-semibold tracking-wider text-[#172B25] uppercase mb-1.5", className)}
      {...props}
    />
  );
}
