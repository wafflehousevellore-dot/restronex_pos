import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/40 active:scale-[0.98]",
        emerald: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950/40 active:scale-[0.98]",
        accent: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm active:scale-[0.98]",
        outline: "border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white shadow-sm active:scale-[0.98]",
        ghost: "hover:bg-slate-800/60 text-slate-300 hover:text-white",
        subtle: "bg-slate-800/80 text-slate-200 hover:bg-slate-700",
        secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700/60",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3.5 text-xs",
        lg: "h-11 px-7 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
export { Button, buttonVariants };
