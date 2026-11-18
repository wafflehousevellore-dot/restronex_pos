"use client";

import React, { useState, useEffect } from "react";
import {
  ChefHat,
  Clock,
  Building2,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Keyboard,
  RotateCw,
  Search,
  X,
  Radio,
} from "lucide-react";

interface KDSHeaderProps {
  clockTime: string;
  selectedStation: string;
  onSelectStation: (station: string) => void;
  selectedOutletId: string;
  onSelectOutlet: (outletId: string) => void;
  outlets: Array<{ id: string; name: string }>;
  soundEnabled: boolean;
  onToggleSound: () => void;
  audioUnlocked: boolean;
  onUnlockAudio: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenShortcutsModal: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const KITCHEN_STATIONS = [
  { id: "ALL", label: "All Stations" },
  { id: "MAIN", label: "Main Kitchen" },
  { id: "BAR", label: "Beverages / Bar" },
  { id: "GRILL", label: "Grill / Tandoor" },
  { id: "BAKERY", label: "Bakery / Oven" },
  { id: "DESSERT", label: "Dessert Counter" },
];

export function KDSHeader({
  clockTime,
  selectedStation,
  onSelectStation,
  selectedOutletId,
  onSelectOutlet,
  outlets,
  soundEnabled,
  onToggleSound,
  audioUnlocked,
  onUnlockAudio,
  isFullscreen,
  onToggleFullscreen,
  onOpenShortcutsModal,
  searchQuery,
  onSearchChange,
  isConnected,
  onRefresh,
  isRefreshing,
}: KDSHeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0 shadow-lg select-none">
      {/* Left: Branding, Station Tabs, and Live Clock */}
      <div className="flex flex-wrap items-center gap-3 flex-1">
        <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-[#16845B] flex items-center justify-center text-white shadow-xs">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight leading-tight flex items-center gap-1.5">
              <span>RestroNex KDS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-800 text-slate-300 border border-slate-700">
                PRO
              </span>
            </h1>
            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {clockTime}
            </span>
          </div>
        </div>

        {/* Kitchen Station Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {KITCHEN_STATIONS.map((st) => {
            const isSelected = selectedStation === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onSelectStation(st.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-[#16845B] text-white shadow-xs"
                    : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center/Right: Search, Outlet Selector, Controls */}
      <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
        {/* Search Order / Table */}
        <div className="relative min-w-[140px] max-w-[190px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search KOT / Table..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-7 pr-6 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:bg-slate-800 focus:outline-none focus:border-[#16845B]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Outlet Switcher if multiple */}
        {outlets.length > 1 && (
          <div className="relative flex items-center">
            <Building2 className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedOutletId}
              onChange={(e) => onSelectOutlet(e.target.value)}
              className="pl-7 pr-6 py-1 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-semibold focus:outline-none cursor-pointer appearance-none"
            >
              <option value="ALL">All Outlets</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Connection Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${
            isConnected
              ? "bg-emerald-950/70 border-emerald-800 text-emerald-400"
              : "bg-amber-950/70 border-amber-800 text-amber-400"
          }`}
          title={isConnected ? "Realtime SSE Active" : "Reconnecting to live order stream..."}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className="hidden sm:inline">{isConnected ? "LIVE" : "RECONNECTING"}</span>
        </div>

        {/* Sound Toggle & Autoplay Notice */}
        {!audioUnlocked && soundEnabled ? (
          <button
            type="button"
            onClick={onUnlockAudio}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition animate-pulse"
            title="Click to enable kitchen audio chimes"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Enable Audio</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg border transition ${
              soundEnabled
                ? "bg-slate-800 border-slate-700 text-[#16845B]"
                : "bg-slate-800 border-slate-700 text-slate-500"
            }`}
            title={soundEnabled ? "Mute audio chimes (M)" : "Unmute audio chimes (M)"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}

        {/* Bump Bar Keyboard Shortcuts Modal */}
        <button
          type="button"
          onClick={onOpenShortcutsModal}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          title="Bump Bar Keyboard Shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Manual Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition disabled:opacity-50"
          title="Refresh ticket queue"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#16845B]" : ""}`} />
        </button>
      </div>
    </header>
  );
}
