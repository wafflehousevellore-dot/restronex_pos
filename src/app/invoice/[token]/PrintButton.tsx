"use client";

import React from "react";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#172B25] bg-white border border-[#E5EBE7] hover:bg-[#F8FAF9] rounded-xl transition cursor-pointer"
    >
      <Printer className="h-3.5 w-3.5 text-[#718078]" />
      <span>Print</span>
    </button>
  );
}
