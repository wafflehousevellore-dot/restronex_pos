"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import { MenuOverviewMetrics, MenuMetricsData } from "./MenuOverviewMetrics";
import { MenuCategorySidebar, CategoryData } from "./MenuCategorySidebar";
import { MenuProductTable } from "./MenuProductTable";
import { ProductFormModal, MenuItemData } from "./ProductFormModal";
import { CategoryModal } from "./CategoryModal";
import { BulkOperationsBar } from "./BulkOperationsBar";
import { MenuCsvModal } from "./MenuCsvModal";
import { Utensils, CheckCircle2, AlertCircle } from "lucide-react";

interface MenuClientProps {
  initialCategories?: CategoryData[];
  initialItems?: MenuItemData[];
  initialMetrics?: MenuMetricsData;
}

export function MenuClient({
  initialCategories = [],
  initialItems = [],
  initialMetrics,
}: MenuClientProps) {
  const [categories, setCategories] = useState<CategoryData[]>(initialCategories);
  const [items, setItems] = useState<MenuItemData[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters & Selection
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [activeMetricFilter, setActiveMetricFilter] = useState<string>("ALL");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Modals State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuItemData | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);

  const [csvModalMode, setCsvModalMode] = useState<"EXPORT" | "IMPORT" | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Menu Data
  const loadMenu = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/menu");
      if (res.ok) {
        const data = await res.json();
        if (data.categories) setCategories(data.categories);
        if (data.items) setItems(data.items);
      }
    } catch {
      showToast("Failed to load menu data", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // Compute live metrics
  const computedMetrics: MenuMetricsData = useMemo(() => {
    let activeProducts = 0;
    let inactiveProducts = 0;
    let outOfStockProducts = 0;
    let productsWithModifiers = 0;
    let vegCount = 0;
    let nonVegCount = 0;

    items.forEach((it) => {
      if (it.isActive) activeProducts++;
      else inactiveProducts++;

      if (it.isSoldOut) outOfStockProducts++;

      if (it.addonLinks && it.addonLinks.length > 0) {
        productsWithModifiers++;
      }

      if (it.isVeg) vegCount++;
      else nonVegCount++;
    });

    return {
      totalProducts: items.length,
      activeProducts,
      inactiveProducts,
      outOfStockProducts,
      productsWithModifiers,
      categoriesCount: categories.length,
      vegCount,
      nonVegCount,
    };
  }, [items, categories]);

  // Filter Items by active metric filter if selected
  const displayedItems = useMemo(() => {
    if (activeMetricFilter === "ACTIVE") return items.filter((it) => it.isActive);
    if (activeMetricFilter === "OUT_OF_STOCK") return items.filter((it) => it.isSoldOut);
    if (activeMetricFilter === "WITH_MODIFIERS")
      return items.filter((it) => it.addonLinks && it.addonLinks.length > 0);
    if (activeMetricFilter === "VEG") return items.filter((it) => it.isVeg);
    if (activeMetricFilter === "NON_VEG") return items.filter((it) => !it.isVeg);
    return items;
  }, [items, activeMetricFilter]);

  // Multi-select handlers
  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedItemIds.length === displayedItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(displayedItems.map((it) => it.id));
    }
  };

  // Product Actions
  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: MenuItemData) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (productData: any) => {
    const isEdit = Boolean(productData.id);
    const method = isEdit ? "PUT" : "POST";
    const payload = isEdit
      ? { ...productData, type: "item" }
      : { ...productData, type: "item" };

    const res = await apiFetch("/api/menu", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showToast(isEdit ? "Product updated successfully." : "Product created successfully.");
      await loadMenu();
    } else {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to save product.");
    }
  };

  const handleToggleStock = async (product: MenuItemData) => {
    const nextState = !product.isSoldOut;
    // Optimistic UI update
    setItems((prev) =>
      prev.map((it) => (it.id === product.id ? { ...it, isSoldOut: nextState } : it))
    );

    const res = await apiFetch("/api/menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: product.id, isSoldOut: nextState }),
    });

    if (res.ok) {
      showToast(`${product.name} is now marked ${nextState ? "Sold Out" : "In Stock"}.`);
    } else {
      showToast("Error updating stock status.", "error");
      await loadMenu();
    }
  };

  const handleDuplicateProduct = async (product: MenuItemData) => {
    const res = await apiFetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate_item", itemId: product.id }),
    });

    if (res.ok) {
      showToast(`Duplicated '${product.name}' as copy.`);
      await loadMenu();
    } else {
      showToast("Error duplicating product.", "error");
    }
  };

  const handleDeleteProduct = async (product: MenuItemData) => {
    if (!confirm(`Are you sure you want to delete '${product.name}'?`)) return;

    const res = await apiFetch(`/api/menu?type=item&id=${encodeURIComponent(product.id)}`, {
      method: "DELETE",
    });

    if (res.ok) {
      showToast(`Deleted '${product.name}'.`);
      setItems((prev) => prev.filter((it) => it.id !== product.id));
      setSelectedItemIds((prev) => prev.filter((id) => id !== product.id));
    } else {
      showToast("Error deleting product.", "error");
    }
  };

  // Category Actions
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryData) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (catData: any) => {
    const isEdit = Boolean(catData.id);
    const method = isEdit ? "PUT" : "POST";
    const payload = { ...catData, type: "category" };

    const res = await apiFetch("/api/menu", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      showToast(isEdit ? "Category updated." : "Category created.");
      await loadMenu();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || "Failed to save category.", "error");
    }
  };

  const handleDeleteCategoryWithReassign = async (
    categoryId: string,
    reassignToCategoryId?: string
  ) => {
    const params = new URLSearchParams({
      type: "category",
      id: categoryId,
    });
    if (reassignToCategoryId) {
      params.set("reassignToCategoryId", reassignToCategoryId);
    }

    const res = await apiFetch(`/api/menu?${params.toString()}`, {
      method: "DELETE",
    });

    if (res.ok) {
      showToast("Category deleted successfully.");
      if (selectedCategoryId === categoryId) setSelectedCategoryId("ALL");
      await loadMenu();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || "Failed to delete category.", "error");
    }
  };

  // Bulk Operations Handlers
  const handleBulkStock = async (isSoldOut: boolean) => {
    const res = await apiFetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk_stock", itemIds: selectedItemIds, isSoldOut }),
    });

    if (res.ok) {
      showToast(
        `Marked ${selectedItemIds.length} items as ${isSoldOut ? "Sold Out" : "In Stock"}.`
      );
      setSelectedItemIds([]);
      await loadMenu();
    } else {
      showToast("Failed to update bulk stock.", "error");
    }
  };

  const handleBulkActive = async (isActive: boolean) => {
    const res = await apiFetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk_active", itemIds: selectedItemIds, isActive }),
    });

    if (res.ok) {
      showToast(`Updated active status for ${selectedItemIds.length} items.`);
      setSelectedItemIds([]);
      await loadMenu();
    } else {
      showToast("Failed to update status.", "error");
    }
  };

  const handleBulkCategory = async (categoryId: string) => {
    const res = await apiFetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk_category", itemIds: selectedItemIds, categoryId }),
    });

    if (res.ok) {
      showToast(`Moved ${selectedItemIds.length} items to new category.`);
      setSelectedItemIds([]);
      await loadMenu();
    } else {
      showToast("Failed to reassign category.", "error");
    }
  };

  const handleBulkPrice = async (percentageChange: number, flatAmountPaise: number) => {
    const res = await apiFetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bulk_price",
        itemIds: selectedItemIds,
        percentageChange,
        flatAmountPaise,
      }),
    });

    if (res.ok) {
      showToast(`Adjusted prices for ${selectedItemIds.length} items.`);
      setSelectedItemIds([]);
      await loadMenu();
    } else {
      showToast("Failed to adjust prices.", "error");
    }
  };

  // CSV Import
  const handleImportItems = async (importedRows: any[]) => {
    let successCount = 0;
    for (const r of importedRows) {
      try {
        const res = await apiFetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "item",
            name: r.name,
            categoryId: r.categoryId,
            pricePaise: r.pricePaise,
            isVeg: r.isVeg,
            sku: r.sku,
          }),
        });
        if (res.ok) successCount++;
      } catch {}
    }

    showToast(`Successfully imported ${successCount} products.`);
    await loadMenu();
  };

  return (
    <div className="space-y-4 text-slate-800 relative pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold animate-in slide-in-from-top-3 ${
            toast.type === "success"
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#16845B]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[#16845B]" />
            Restaurant Menu Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Petpooja-inspired master catalog control: products, variants, modifier groups, and stock availability.
          </p>
        </div>
      </div>

      {/* 1. Operational Overview Metrics (Section 2) */}
      <MenuOverviewMetrics
        metrics={computedMetrics}
        activeFilter={activeMetricFilter}
        onFilterSelect={(flt) => setActiveMetricFilter(flt)}
      />

      {/* 2. Main Two-Column Layout (Categories Sidebar + Products Table) */}
      <div className="flex flex-col lg:flex-row items-start gap-4">
        {/* Left: Category Sidebar (Section 3) */}
        <MenuCategorySidebar
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(cId) => setSelectedCategoryId(cId)}
          onOpenCreateCategory={handleOpenCreateCategory}
          onOpenEditCategory={handleOpenEditCategory}
          onDeleteCategory={handleOpenEditCategory}
          totalProductsCount={items.length}
        />

        {/* Right: Products Management Table (Section 4) */}
        <MenuProductTable
          items={displayedItems}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          selectedItemIds={selectedItemIds}
          onToggleSelectItem={handleToggleSelectItem}
          onToggleSelectAll={handleToggleSelectAll}
          onOpenCreateProduct={handleOpenCreateProduct}
          onOpenEditProduct={handleOpenEditProduct}
          onDuplicateProduct={handleDuplicateProduct}
          onDeleteProduct={handleDeleteProduct}
          onToggleStock={handleToggleStock}
          onExportCsv={() => setCsvModalMode("EXPORT")}
          onImportCsv={() => setCsvModalMode("IMPORT")}
          isLoading={isLoading}
        />
      </div>

      {/* 3. Floating Bulk Operations Bar (Section 8) */}
      <BulkOperationsBar
        selectedCount={selectedItemIds.length}
        categories={categories}
        onMarkStock={handleBulkStock}
        onMarkActive={handleBulkActive}
        onBulkCategory={handleBulkCategory}
        onBulkPrice={handleBulkPrice}
        onClearSelection={() => setSelectedItemIds([])}
      />

      {/* 4. Product Create / Edit Modal (Section 5, 6, 7) */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSaveProduct={handleSaveProduct}
      />

      {/* 5. Category Create / Edit Modal (Section 3) */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        category={editingCategory}
        allCategories={categories}
        onSaveCategory={handleSaveCategory}
        onDeleteCategoryWithReassign={handleDeleteCategoryWithReassign}
      />

      {/* 6. Menu CSV Import / Export Modal (Section 8) */}
      <MenuCsvModal
        isOpen={csvModalMode !== null}
        onClose={() => setCsvModalMode(null)}
        mode={csvModalMode || "EXPORT"}
        items={items}
        categories={categories}
        onImportItems={handleImportItems}
      />
    </div>
  );
}
