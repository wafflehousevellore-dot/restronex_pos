"use client";

import * as React from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7days"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateRangeValue {
  preset: DateRangePreset;
  startDate?: string;
  endDate?: string;
  label?: string;
}

export interface DateRangeSelectorProps {
  value?: DateRangeValue;
  onChange?: (value: DateRangeValue) => void;
  className?: string;
}

const presets: { id: DateRangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7days", label: "Last 7 Days" },
  { id: "thisMonth", label: "This Month" },
];

export function DateRangeSelector({
  value = { preset: "today" },
  onChange,
  className,
}: DateRangeSelectorProps) {
  const [activePreset, setActivePreset] = React.useState<DateRangePreset>(value.preset);
  const [showCustom, setShowCustom] = React.useState<boolean>(value.preset === "custom");
  const [startDate, setStartDate] = React.useState<string>(value.startDate || "");
  const [endDate, setEndDate] = React.useState<string>(value.endDate || "");

  const handleSelectPreset = (preset: DateRangePreset) => {
    setActivePreset(preset);
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    onChange?.({ preset });
  };

  const handleApplyCustom = () => {
    onChange?.({
      preset: "custom",
      startDate,
      endDate,
      label: `${startDate} to ${endDate}`,
    });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <div className="inline-flex items-center rounded-xl border border-[#E5EBE7] bg-white p-1 shadow-2xs">
        <div className="flex items-center px-2 py-1 text-xs font-semibold text-[#718078] border-r border-[#E5EBE7] mr-1 hidden sm:flex">
          <Calendar className="h-3.5 w-3.5 mr-1.5 text-[#16845B]" />
          <span>Range</span>
        </div>

        {presets.map((p) => {
          const isSelected = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                isSelected
                  ? "bg-[#16845B] text-white shadow-2xs"
                  : "text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9]"
              )}
            >
              {p.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => handleSelectPreset("custom")}
          className={cn(
            "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all flex items-center gap-1",
            activePreset === "custom"
              ? "bg-[#16845B] text-white shadow-2xs"
              : "text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9]"
          )}
        >
          <span>Custom</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 rounded-xl border border-[#E5EBE7] bg-white p-1.5 shadow-2xs text-xs animate-in fade-in duration-200">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] px-2 py-1 text-xs text-[#172B25] focus:outline-none focus:border-[#16845B]"
          />
          <span className="text-[#718078]">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-[#E5EBE7] bg-[#F8FAF9] px-2 py-1 text-xs text-[#172B25] focus:outline-none focus:border-[#16845B]"
          />
          <button
            type="button"
            onClick={handleApplyCustom}
            className="rounded-lg bg-[#16845B] hover:bg-[#116B49] text-white px-3 py-1 font-semibold text-xs transition"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
