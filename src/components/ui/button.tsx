import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B]/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#16845B] text-white hover:bg-[#116B49] shadow-xs hover:shadow-sm",
        emerald: "bg-[#16845B] text-white hover:bg-[#116B49] shadow-xs hover:shadow-sm",
        accent: "bg-[#16845B] text-white hover:bg-[#116B49] shadow-xs",
        secondary: "bg-[#E8F5EE] text-[#16845B] hover:bg-[#d8ece0] font-semibold",
        outline: "border border-[#E5EBE7] bg-white text-[#172B25] hover:bg-[#F8FAF9] hover:border-[#16845B]/40 hover:text-[#16845B] shadow-2xs",
        subtle: "bg-[#F0F4F2] text-[#172B25] hover:bg-[#E5EBE7]",
        ghost: "hover:bg-[#E8F5EE] text-[#172B25] hover:text-[#16845B]",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-xs",
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
