"use client";

import React, { useState } from "react";
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronRight,
  X,
  Layers,
} from "lucide-react";

export interface CategoryData {
  id: string;
  name: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
  imageUrl?: string | null;
  items?: Array<{ id: string; name: string }>;
}

interface MenuCategorySidebarProps {
  categories: CategoryData[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onOpenCreateCategory: () => void;
  onOpenEditCategory: (category: CategoryData) => void;
  onDeleteCategory: (category: CategoryData) => void;
  totalProductsCount: number;
}

export function MenuCategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenCreateCategory,
  onOpenEditCategory,
  onDeleteCategory,
  totalProductsCount,
}: MenuCategorySidebarProps) {
  const [search, setSearch] = useState("");

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full lg:w-64 bg-white rounded-xl border border-slate-200 shadow-2xs p-3 flex flex-col shrink-0">
      {/* Header & Add Category Button */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <FolderTree className="w-4 h-4 text-[#16845B]" />
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Categories ({categories.length})
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenCreateCategory}
          className="p-1 rounded-lg bg-[#E8F5EE] hover:bg-[#16845B] hover:text-white text-[#16845B] text-xs font-bold transition flex items-center gap-1 shadow-2xs"
          title="Create New Category"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px] pr-1">New</span>
        </button>
      </div>

      {/* Category Search Input */}
      <div className="relative my-2.5">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#16845B] transition"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Categories Scrollable List */}
      <div className="space-y-1 overflow-y-auto max-h-[460px] pr-0.5">
        {/* All Products Option */}
        <button
          type="button"
          onClick={() => onSelectCategory("ALL")}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
            selectedCategoryId === "ALL"
              ? "bg-[#16845B] text-white shadow-xs"
              : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Layers className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span className="truncate">All Categories</span>
          </div>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
              selectedCategoryId === "ALL"
                ? "bg-white/25 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {totalProductsCount}
          </span>
        </button>

        {/* Individual Categories */}
        {filteredCategories.length === 0 ? (
          <p className="text-[11px] text-slate-400 py-4 text-center">No categories found</p>
        ) : (
          filteredCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const count = cat.items?.length || 0;

            return (
              <div
                key={cat.id}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-left ${
                  isSelected
                    ? "bg-[#16845B] text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className="flex-1 flex items-center justify-between gap-1.5 truncate text-left cursor-pointer mr-1"
                >
                  <span className="truncate font-medium">{cat.name}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>

                {/* Edit & Delete Action Icons (hover-revealed) */}
                <div
                  className={`flex items-center gap-0.5 shrink-0 ${
                    isSelected ? "text-white" : "opacity-0 group-hover:opacity-100 transition"
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEditCategory(cat);
                    }}
                    className={`p-1 rounded hover:bg-black/10 transition ${
                      isSelected ? "text-white" : "text-slate-400 hover:text-slate-700"
                    }`}
                    title="Edit category"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCategory(cat);
                    }}
                    className={`p-1 rounded hover:bg-black/10 transition ${
                      isSelected ? "text-white" : "text-slate-400 hover:text-rose-600"
                    }`}
                    title="Delete category"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
