"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { 
  Users, 
  Utensils, 
  Clock, 
  QrCode, 
  ArrowRightLeft, 
  MoreVertical, 
  ExternalLink, 
  Check, 
  Sparkles, 
  Edit2, 
  Trash2, 
  AlertTriangle,
  Receipt,
  Printer
} from "lucide-react";
import Link from "next/link";

interface VisualFloorPlanViewProps {
  tables: any[];
  onSelectTable: (table: any) => void;
  onOpenQrModal: (table: any) => void;
  onOpenShiftModal: (table: any) => void;
  onOpenEditModal: (table: any) => void;
  onUpdateStatus: (tableId: string, status: string) => Promise<void>;
  onCloseTable: (tableId: string) => Promise<void>;
  onDeleteTable: (tableId: string) => Promise<void>;
  viewMode: "MAP" | "GRID";
}

export function VisualFloorPlanView({
  tables,
  onSelectTable,
  onOpenQrModal,
  onOpenShiftModal,
  onOpenEditModal,
  onUpdateStatus,
  onCloseTable,
  onDeleteTable,
  viewMode,
}: VisualFloorPlanViewProps) {
  const [activeMenuTableId, setActiveMenuTableId] = useState<string | null>(null);

  // Helper to format dining duration
  const getElapsedDuration = (createdAt?: string | Date) => {
    if (!createdAt) return "Active";
    const start = new Date(createdAt).getTime();
    const now = Date.now();
    const diffMins = Math.floor((now - start) / (1000 * 60));
    if (diffMins < 60) return `${Math.max(diffMins, 1)}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  // Group tables by area
  const tablesByArea: Record<string, any[]> = tables.reduce((acc: Record<string, any[]>, t) => {
    const area = t.area || "Main Hall";
    if (!acc[area]) acc[area] = [];
    acc[area].push(t);
    return acc;
  }, {});

  if (tables.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-[#E5EBE7] shadow-xs max-w-lg mx-auto">
        <Utensils className="h-12 w-12 text-[#718078] mx-auto mb-3 opacity-40" />
        <h3 className="text-base font-bold text-[#172B25]">No Tables Found</h3>
        <p className="text-xs text-[#718078] mt-1">
          No dining tables match your selected area or filter. Adjust your filter or add new tables to this outlet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {(Object.entries(tablesByArea) as [string, any[]][]).map(([areaName, areaTables]) => (
        <div key={areaName} className="space-y-3">
          {/* Area Section Title */}
          <div className="flex items-center justify-between border-b border-[#E5EBE7] pb-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#16845B]" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#172B25]">{areaName}</h2>
              <span className="text-xs font-semibold text-[#718078] bg-gray-100 px-2 py-0.5 rounded-full">
                {areaTables.length} tables • {areaTables.reduce((s, t) => s + (t.capacity || 4), 0)} seats
              </span>
            </div>
            <div className="text-xs text-[#718078] font-medium">
              {areaTables.filter((t) => t.status === "AVAILABLE").length} available
            </div>
          </div>

          {/* Tables Grid / Floor Layout */}
          <div
            className={`grid gap-4 ${
              viewMode === "GRID"
                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            }`}
          >
            {areaTables.map((table) => {
              const isOccupied = table.status === "OCCUPIED" || table.status === "BILLING";
              const isBilled = table.status === "BILLED";
              const isReserved = table.status === "RESERVED";
              const isCleaning = table.status === "CLEANING";
              const isAvailable = table.status === "AVAILABLE";

              // Visual styling per status
              let statusBorder = "border-[#E5EBE7] hover:border-[#16845B]/60";
              let statusBg = "bg-white";
              let statusBadgeBg = "bg-emerald-100 text-emerald-800";
              let statusLabel = "Available";

              if (isOccupied) {
                statusBorder = "border-blue-300 ring-1 ring-blue-200";
                statusBg = "bg-blue-50/20";
                statusBadgeBg = "bg-blue-600 text-white";
                statusLabel = "Occupied";
              } else if (isBilled) {
                statusBorder = "border-amber-300 ring-1 ring-amber-200";
                statusBg = "bg-amber-50/20";
                statusBadgeBg = "bg-amber-500 text-white";
                statusLabel = "Billed";
              } else if (isReserved) {
                statusBorder = "border-purple-300 ring-1 ring-purple-200";
                statusBg = "bg-purple-50/20";
                statusBadgeBg = "bg-purple-600 text-white";
                statusLabel = "Reserved";
              } else if (isCleaning) {
                statusBorder = "border-orange-300 ring-1 ring-orange-200";
                statusBg = "bg-orange-50/20";
                statusBadgeBg = "bg-orange-500 text-white";
                statusLabel = "Cleaning";
              }

              // Shape representation
              const isLarge = (table.capacity || 4) >= 7;
              const isRound = (table.capacity || 4) >= 5 && (table.capacity || 4) <= 6;

              return (
                <div
                  key={table.id}
                  className={`group relative rounded-2xl border ${statusBorder} ${statusBg} p-3.5 shadow-xs transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                    isRound ? "rounded-3xl" : ""
                  }`}
                >
                  {/* Card Header: Table Number & QR / Actions */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-black text-[#172B25] tracking-tight">
                          {table.number}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusBadgeBg}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#718078]">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{table.capacity || 4} seats</span>
                        </span>
                        {table.waiterName && (
                          <span className="text-[#172B25] font-semibold truncate max-w-[90px]">
                            • {table.waiterName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Top Right Actions */}
                    <div className="flex items-center gap-1">
                      {/* QR Tent preview button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenQrModal(table);
                        }}
                        className="p-1 rounded-lg text-[#718078] hover:text-[#172B25] hover:bg-gray-100 transition cursor-pointer"
                        title="View Table QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>

                      {/* Menu trigger */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuTableId(activeMenuTableId === table.id ? null : table.id);
                          }}
                          className="p-1 rounded-lg text-[#718078] hover:text-[#172B25] hover:bg-gray-100 transition cursor-pointer"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuTableId === table.id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-[#E5EBE7] py-1 z-30 text-xs font-semibold"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                onOpenEditModal(table);
                                setActiveMenuTableId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 text-[#172B25] cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                              <span>Edit Table</span>
                            </button>

                            {isOccupied && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenShiftModal(table);
                                  setActiveMenuTableId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 text-[#172B25] cursor-pointer"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" />
                                <span>Shift Table Order</span>
                              </button>
                            )}

                            {isCleaning && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateStatus(table.id, "AVAILABLE");
                                  setActiveMenuTableId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-emerald-50 text-emerald-700 cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Mark Available</span>
                              </button>
                            )}

                            {!isCleaning && !isOccupied && (
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateStatus(table.id, "CLEANING");
                                  setActiveMenuTableId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-orange-50 text-orange-700 cursor-pointer"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                                <span>Mark for Cleaning</span>
                              </button>
                            )}

                            {isOccupied && (
                              <button
                                type="button"
                                onClick={() => {
                                  onCloseTable(table.id);
                                  setActiveMenuTableId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-amber-50 text-amber-700 cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5 text-amber-600" />
                                <span>Clear / Release Table</span>
                              </button>
                            )}

                            <div className="border-t border-gray-100 my-1" />

                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTable(table.id);
                                setActiveMenuTableId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-red-50 text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete Table</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Content: Live Order Info or Seating State */}
                  <div
                    onClick={() => onSelectTable(table)}
                    className="my-3 py-2 cursor-pointer border-t border-dashed border-[#E5EBE7]"
                  >
                    {isOccupied || isBilled ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#718078] flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-600" />
                            <span>{getElapsedDuration(table.activeOrder?.createdAt)}</span>
                          </span>
                          <span className="font-bold text-[#172B25]">
                            {table.activeOrder?.items?.length || 0} items
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] text-[#718078] uppercase font-semibold">
                            Total Bill
                          </span>
                          <span className="text-base font-black text-[#16845B]">
                            {formatINR(table.orderTotalPaise || table.activeOrder?.totalAmountPaise || 0)}
                          </span>
                        </div>
                      </div>
                    ) : isCleaning ? (
                      <div className="py-2 text-center text-xs text-orange-700 font-semibold bg-orange-100/50 rounded-xl">
                        Table needs sanitizing & reset
                      </div>
                    ) : isReserved ? (
                      <div className="py-2 text-center text-xs text-purple-700 font-semibold bg-purple-100/50 rounded-xl">
                        Reserved for upcoming guest
                      </div>
                    ) : (
                      <div className="py-2 text-center text-xs text-emerald-700 font-semibold bg-emerald-100/40 rounded-xl hover:bg-emerald-100/70 transition">
                        Available • Ready to Seat
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#E5EBE7]">
                    {isOccupied || isBilled ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelectTable(table)}
                          className="flex-1 py-1.5 bg-[#172B25] hover:bg-black text-white text-xs font-bold rounded-xl transition text-center cursor-pointer shadow-xs"
                        >
                          View Order
                        </button>
                        <Link
                          href={`/app/pos?tableId=${table.id}`}
                          className="p-1.5 bg-[#16845B] hover:bg-[#126b49] text-white rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center"
                          title="Open in POS"
                        >
                          <Utensils className="h-4 w-4" />
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href={`/app/pos?tableId=${table.id}`}
                          className="flex-1 py-1.5 bg-[#16845B] hover:bg-[#126b49] text-white text-xs font-bold rounded-xl transition text-center cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <Utensils className="h-3.5 w-3.5" />
                          <span>Take Order</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
