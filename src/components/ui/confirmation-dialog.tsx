"use client";

import * as React from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmationDialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isLoading, onClose]);

  if (!open) return null;

  const isDestructive = variant === "destructive";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal Dialog Box */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-50 w-full max-w-md rounded-3xl border border-[#E5EBE7] bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150"
      >
        <button
          type="button"
          onClick={() => !isLoading && onClose()}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] transition"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="flex items-start gap-4">
          <div
            className={cn(
              "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs",
              isDestructive
                ? "bg-red-50 border border-red-200 text-red-600"
                : "bg-[#E8F5EE] border border-[#16845B]/20 text-[#16845B]"
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="space-y-1.5 pr-4">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-[#172B25]">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[#718078] leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-[#E5EBE7]/60">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-xl border border-[#E5EBE7] bg-white hover:bg-[#F8FAF9] px-4 py-2 text-xs font-semibold text-[#172B25] shadow-2xs transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              "rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50 inline-flex items-center gap-1.5",
              isDestructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#16845B] hover:bg-[#116B49]"
            )}
          >
            {isLoading && (
              <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            )}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
