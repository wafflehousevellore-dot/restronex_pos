"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg" | "xl";
}

export function FormDrawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
}: FormDrawerProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent background scroll when drawer is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const widthClasses = {
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-2xl",
  }[width];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "w-screen bg-white shadow-2xl flex flex-col border-l border-[#E5EBE7] animate-in slide-in-from-right duration-200",
            widthClasses
          )}
        >
          {/* Header */}
          <div className="h-[68px] px-6 border-b border-[#E5EBE7] flex items-center justify-between shrink-0 bg-white">
            <div className="min-w-0 pr-4">
              <h2 className="text-base font-bold text-[#172B25] truncate">
                {title}
              </h2>
              {description && (
                <p className="text-xs text-[#718078] truncate mt-0.5">
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-[#E5EBE7] text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] transition"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close drawer</span>
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin bg-white space-y-4">
            {children}
          </div>

          {/* Sticky Footer */}
          {footer && (
            <div className="p-4 px-6 border-t border-[#E5EBE7] bg-[#F8FAF9]/60 shrink-0 flex items-center justify-end gap-2.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
