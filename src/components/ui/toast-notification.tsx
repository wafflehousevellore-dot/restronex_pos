"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (options: Omit<ToastMessage, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { ...options, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = options.duration ?? 4000;
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const value = React.useMemo(
    () => ({
      toast: addToast,
      success: (title: string, description?: string) =>
        addToast({ type: "success", title, description }),
      error: (title: string, description?: string) =>
        addToast({ type: "error", title, description }),
      info: (title: string, description?: string) =>
        addToast({ type: "info", title, description }),
      warning: (title: string, description?: string) =>
        addToast({ type: "warning", title, description }),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto rounded-2xl border p-4 shadow-lg flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-200 transition-all",
              t.type === "success" && "bg-white border-[#16845B]/30 text-[#172B25]",
              t.type === "error" && "bg-white border-red-200 text-[#172B25]",
              t.type === "warning" && "bg-white border-amber-200 text-[#172B25]",
              t.type === "info" && "bg-white border-sky-200 text-[#172B25]"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {t.type === "success" && <CheckCircle2 className="h-5 w-5 text-[#16845B]" />}
              {t.type === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}
              {t.type === "warning" && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              {t.type === "info" && <Info className="h-5 w-5 text-sky-600" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="text-xs font-bold text-[#172B25]">{t.title}</div>
              {t.description && (
                <div className="text-[11px] text-[#718078] mt-0.5 leading-relaxed">
                  {t.description}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-md text-[#718078] hover:text-[#172B25] transition shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
    };
  }
  return context;
}
