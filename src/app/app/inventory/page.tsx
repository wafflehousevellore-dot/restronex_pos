"use client";

import { Suspense } from "react";
import { InventoryClient } from "@/components/app/inventory/InventoryClient";

export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-xs font-bold text-[#718078] flex items-center justify-center min-h-[300px]">
          Loading Inventory & Operations...
        </div>
      }
    >
      <InventoryClient />
    </Suspense>
  );
}
