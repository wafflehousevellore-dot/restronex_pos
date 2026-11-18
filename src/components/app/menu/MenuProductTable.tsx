"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import { MenuItemData } from "./ProductFormModal";
import { CategoryData } from "./MenuCategorySidebar";
import {
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Edit2,
  Copy,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Leaf,
  Beef,
  ArrowUpDown,
  Utensils,
  Image as ImageIcon,
} from "lucide-react";

interface MenuProductTableProps {
  items: MenuItemData[];
  categories: CategoryData[];
  selectedCategoryId: string;
  selectedItemIds: string[];
  onToggleSelectItem: (itemId: string) => void;
  onToggleSelectAll: () => void;
  onOpenCreateProduct: () => void;
  onOpenEditProduct: (product: MenuItemData) => void;
  onDuplicateProduct: (product: MenuItemData) => void;
  onDeleteProduct: (product: MenuItemData) => void;
  onToggleStock: (product: MenuItemData) => void;
  onExportCsv: () => void;
  onImportCsv: () => void;
  isLoading: boolean;
}

export function MenuProductTable({
  items,
  categories,
  selectedCategoryId,
  selectedItemIds,
  onToggleSelectItem,
  onToggleSelectAll,
  onOpenCreateProduct,
  onOpenEditProduct,
  onDuplicateProduct,
  onDeleteProduct,
  onToggleStock,
  onExportCsv,
  onImportCsv,
  isLoading,
}: MenuProductTableProps) {
  const [search, setSearch] = useState("");
  const [foodTypeFilter, setFoodTypeFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "IN_STOCK" | "OUT_OF_STOCK">("ALL");
  const [sortField, setSortField] = useState<"name" | "pricePaise" | "category">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter items
  const filteredItems = items.filter((item) => {
    // Category filter
    if (selectedCategoryId !== "ALL" && item.categoryId !== selectedCategoryId) {
      return false;
    }
    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSku = item.sku?.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchDesc) return false;
    }
    // Food type filter
    if (foodTypeFilter === "VEG" && !item.isVeg) return false;
    if (foodTypeFilter === "NON_VEG" && item.isVeg) return false;
    // Stock filter
    if (stockFilter === "IN_STOCK" && item.isSoldOut) return false;
    if (stockFilter === "OUT_OF_STOCK" && !item.isSoldOut) return false;

    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortField === "name") {
      return sortOrder === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    if (sortField === "pricePaise") {
      return sortOrder === "asc" ? a.pricePaise - b.pricePaise : b.pricePaise - a.pricePaise;
    }
    if (sortField === "category") {
      const catA = a.category?.name || "";
      const catB = b.category?.name || "";
      return sortOrder === "asc" ? catA.localeCompare(catB) : catB.localeCompare(catA);
    }
    return 0;
  });

  const handleSort = (field: "name" | "pricePaise" | "category") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const paginatedItems = sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const allOnPageSelected =
    paginatedItems.length > 0 && paginatedItems.every((it) => selectedItemIds.includes(it.id));

  return (
    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      {/* Top Filter and Actions Toolbar */}
      <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products by name, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#16845B]"
            />
          </div>

          {/* Food Type Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setFoodTypeFilter("ALL")}
              className={`px-2 py-1 font-semibold rounded ${
                foodTypeFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFoodTypeFilter("VEG")}
              className={`px-2 py-1 font-semibold rounded flex items-center gap-1 ${
                foodTypeFilter === "VEG"
                  ? "bg-white text-emerald-800 shadow-2xs"
                  : "text-slate-600 hover:text-emerald-700"
              }`}
            >
              <Leaf className="w-3 h-3 text-emerald-600" />
              Veg
            </button>
            <button
              type="button"
              onClick={() => setFoodTypeFilter("NON_VEG")}
              className={`px-2 py-1 font-semibold rounded flex items-center gap-1 ${
                foodTypeFilter === "NON_VEG"
                  ? "bg-white text-rose-800 shadow-2xs"
                  : "text-slate-600 hover:text-rose-700"
              }`}
            >
              <Beef className="w-3 h-3 text-rose-600" />
              Non-Veg
            </button>
          </div>

          {/* Stock Filter Dropdown */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#16845B]"
          >
            <option value="ALL">All Stock States</option>
            <option value="IN_STOCK">In-Stock Only</option>
            <option value="OUT_OF_STOCK">Out-of-Stock Only</option>
          </select>
        </div>

        {/* Right Toolbar: CSV Export/Import & Add Product */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={onExportCsv}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title="Export Menu to CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={onImportCsv}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title="Import Menu from CSV"
          >
            <Upload className="w-4 h-4 text-slate-500" />
          </button>

          <button
            type="button"
            onClick={onOpenCreateProduct}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16845B] hover:bg-[#13734f] text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-2.5 px-3 w-8">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={onToggleSelectAll}
                  className="accent-[#16845B] w-3.5 h-3.5 rounded cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-2 w-12">Image</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-slate-800"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  <span>Product Name</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-slate-800"
                onClick={() => handleSort("category")}
              >
                <div className="flex items-center gap-1">
                  <span>Category</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-800"
                onClick={() => handleSort("pricePaise")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Price</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-center">Add-ons</th>
              <th className="py-2.5 px-3 text-center">Availability</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={9} className="py-3 px-3">
                    <div className="h-5 bg-slate-100 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No products found</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Adjust your search query or add a new product to your menu.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                const addonCount = item.addonLinks?.length || 0;
                const variantCount = item.variants?.length || 0;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition ${
                      isSelected ? "bg-[#E8F5EE]/40" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectItem(item.id)}
                        className="accent-[#16845B] w-3.5 h-3.5 rounded cursor-pointer"
                      />
                    </td>

                    {/* Image Thumbnail */}
                    <td className="py-2.5 px-2">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 relative">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-400 opacity-60" />
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${
                            item.isVeg ? "bg-emerald-600" : "bg-rose-600"
                          }`}
                        />
                      </div>
                    </td>

                    {/* Product Name & SKU */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 hover:text-[#16845B] cursor-pointer" onClick={() => onOpenEditProduct(item)}>
                          {item.name}
                        </span>
                        {item.sku && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            SKU: {item.sku}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {item.category?.name || "General"}
                      </span>
                    </td>

                    {/* Price & Variants */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-slate-900">
                          {formatINR(item.pricePaise)}
                        </span>
                        {variantCount > 0 && (
                          <span className="text-[10px] text-[#16845B] font-bold">
                            +{variantCount} variants
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Addon / Modifier groups */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {addonCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          <Layers className="w-2.5 h-2.5" />
                          {addonCount} {addonCount === 1 ? "group" : "groups"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* In-Stock Toggle */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onToggleStock(item)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                          !item.isSoldOut
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                        }`}
                        title="Click to toggle in-stock / sold out"
                      >
                        {!item.isSoldOut ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            In Stock
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            Sold Out
                          </>
                        )}
                      </button>
                    </td>

                    {/* Active Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.isActive
                            ? "bg-slate-100 text-slate-700"
                            : "bg-slate-200 text-slate-500 line-through"
                        }`}
                      >
                        {item.isActive ? "Active" : "Archived"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenEditProduct(item)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateProduct(item)}
                          className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-slate-100 transition"
                          title="Duplicate product"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(item)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && sortedItems.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, sortedItems.length)} of {sortedItems.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
