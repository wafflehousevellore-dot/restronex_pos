"use client";

import React from "react";
import { X, Keyboard } from "lucide-react";

interface KDSBumpBarShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KDSBumpBarShortcutsModal({
  isOpen,
  onClose,
}: KDSBumpBarShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "1 – 9", desc: "Bump / Advance ticket at position 1 through 9 directly" },
    { key: "Space / Enter", desc: "Bump the first active ticket in the queue" },
    { key: "F", desc: "Toggle Fullscreen Kitchen Display mode" },
    { key: "M", desc: "Toggle Kitchen Audio Chime (Mute / Unmute)" },
    { key: "R", desc: "Manual refresh / reconnect order stream" },
    { key: "Esc", desc: "Close open modal or slide-over drawer" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-[#16845B]" />
            <span className="font-bold text-sm">Bump Bar & Keyboard Shortcuts</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 text-xs">
          <p className="text-slate-400 mb-3">
            Kitchen staff can use a standard USB bump bar or PC keyboard for fast, hands-free ticket navigation:
          </p>

          <div className="divide-y divide-slate-800">
            {shortcuts.map((s) => (
              <div key={s.key} className="py-2 flex items-center justify-between">
                <span className="text-slate-300 font-medium">{s.desc}</span>
                <kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono font-bold text-emerald-400 text-[11px] shrink-0 ml-3">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#16845B] hover:bg-[#13734f] text-white font-bold text-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
