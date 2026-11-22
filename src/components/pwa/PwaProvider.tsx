"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { WifiOff, RefreshCw, Download, X } from "lucide-react";

interface PwaContextType {
  isOnline: boolean;
  canInstall: boolean;
  promptInstall: () => Promise<void>;
  updateAvailable: boolean;
  applyUpdate: () => void;
}

const PwaContext = createContext<PwaContextType>({
  isOnline: true,
  canInstall: false,
  promptInstall: async () => {},
  updateAvailable: false,
  applyUpdate: () => {},
});

export function usePwa() {
  return useContext(PwaContext);
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissUpdate, setDismissUpdate] = useState<boolean>(false);

  useEffect(() => {
    // Initial online state
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Listen for PWA install prompt
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setCanInstall(true);
      };
      window.addEventListener("beforeinstallprompt", handleBeforeInstall);

      // Register Service Worker in production or localhost
      if ("serviceWorker" in navigator && (window.location.protocol === "https:" || window.location.hostname === "localhost")) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // Check for updates
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    setWaitingWorker(newWorker);
                    setUpdateAvailable(true);
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn("[PWA SW Register Error]:", err);
          });

        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
      setDeferredPrompt(null);
    }
  };

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        canInstall,
        promptInstall,
        updateAvailable,
        applyUpdate,
      }}
    >
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              <strong>Offline Mode:</strong> Internet connection lost. New orders and payments are paused until connectivity is restored to prevent duplicate billing.
            </span>
          </div>
        </div>
      )}

      {/* New Version Update Banner */}
      {updateAvailable && !dismissUpdate && (
        <div className="bg-[#172B25] text-white px-4 py-2.5 text-xs font-medium flex items-center justify-between sticky top-0 z-50 border-b border-emerald-500/30 shadow-lg animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              A new version of RestroNex is available with performance and security enhancements.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={applyUpdate}
              className="px-3 py-1 rounded-lg bg-[#16845B] hover:bg-[#126b4a] text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              Update &amp; Reload
            </button>
            <button
              onClick={() => setDismissUpdate(true)}
              className="p-1 text-gray-400 hover:text-white transition"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {children}
    </PwaContext.Provider>
  );
}
