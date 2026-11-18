"use client";

import React, { useState, useEffect } from "react";
import { formatINR } from "@/lib/money";
import { CategoryData } from "./MenuCategorySidebar";
import { MenuImageUpload } from "@/components/app/MenuImageUpload";
import { ProductAddonManager } from "@/components/app/ProductAddonManager";
import {
  X,
  Utensils,
  Tag,
  DollarSign,
  Layers,
  ChefHat,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Leaf,
  Beef,
  Egg,
} from "lucide-react";

export interface MenuItemData {
  id: string;
  name: string;
  categoryId: string;
  pricePaise: number;
  isVeg: boolean;
  description?: string | null;
  imageUrl?: string | null;
  isSoldOut?: boolean;
  isActive?: boolean;
  sku?: string | null;
  prepTimeMin?: number;
  taxConfigId?: string | null;
  category?: { id: string; name: string };
  variants?: Array<{
    id?: string;
    name: string;
    pricePaise: number;
    isActive?: boolean;
  }>;
  addonLinks?: Array<{
    id?: string;
    addonGroupId: string;
    addonGroup?: {
      id: string;
      name: string;
      options?: Array<{ id: string; name: string; pricePaise: number }>;
    };
  }>;
  recipe?: {
    id: string;
    yieldQty: number;
    ingredients?: Array<{
      id: string;
      quantity: number;
      inventoryItem?: { name: string; unit: string };
    }>;
  };
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: MenuItemData | null; // null for create, object for edit
  categories: CategoryData[];
  onSaveProduct: (data: {
    id?: string;
    name: string;
    categoryId: string;
    pricePaise: number;
    isVeg: boolean;
    description?: string | null;
    imageUrl?: string | null;
    isSoldOut?: boolean;
    isActive?: boolean;
    sku?: string | null;
    prepTimeMin?: number;
    variants?: Array<{ name: string; pricePaise: number; isActive?: boolean }>;
    addonGroupIds?: string[];
  }) => Promise<void>;
  tenantId?: string;
}

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  categories,
  onSaveProduct,
  tenantId,
}: ProductFormModalProps) {
  const [activeTab, setActiveTab] = useState<"GENERAL" | "PRICING" | "MODIFIERS" | "INVENTORY">("GENERAL");

  // Form State
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [isVeg, setIsVeg] = useState(true);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [prepTimeMin, setPrepTimeMin] = useState("10");
  const [isActive, setIsActive] = useState(true);
  const [isSoldOut, setIsSoldOut] = useState(false);

  // Variants State
  const [variants, setVariants] = useState<Array<{ name: string; priceRupees: string; isActive: boolean }>>([]);

  // Addon Groups Assigned
  const [assignedAddonGroupIds, setAssignedAddonGroupIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategoryId(product.categoryId);
      setPriceRupees((product.pricePaise / 100).toFixed(0));
      setIsVeg(product.isVeg);
      setDescription(product.description || "");
      setImageUrl(product.imageUrl || null);
      setSku(product.sku || "");
      setPrepTimeMin(String(product.prepTimeMin || 10));
      setIsActive(product.isActive ?? true);
      setIsSoldOut(product.isSoldOut ?? false);

      if (product.variants && product.variants.length > 0) {
        setVariants(
          product.variants.map((v) => ({
            name: v.name,
            priceRupees: (v.pricePaise / 100).toFixed(0),
            isActive: v.isActive ?? true,
          }))
        );
      } else {
        setVariants([]);
      }

      if (product.addonLinks) {
        setAssignedAddonGroupIds(product.addonLinks.map((al) => al.addonGroupId));
      } else {
        setAssignedAddonGroupIds([]);
      }
    } else {
      setName("");
      setCategoryId(categories[0]?.id || "");
      setPriceRupees("");
      setIsVeg(true);
      setDescription("");
      setImageUrl(null);
      setSku("");
      setPrepTimeMin("10");
      setIsActive(true);
      setIsSoldOut(false);
      setVariants([]);
      setAssignedAddonGroupIds([]);
    }
    setActiveTab("GENERAL");
    setErrorMsg(null);
  }, [product, isOpen, categories]);

  if (!isOpen) return null;

  const handleAddVariant = () => {
    setVariants((prev) => [...prev, { name: "", priceRupees: priceRupees || "0", isActive: true }]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Product name is required.");
      return;
    }
    if (!categoryId) {
      setErrorMsg("Please select a category.");
      return;
    }

    const priceNum = parseFloat(priceRupees);
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg("Please enter a valid base price.");
      return;
    }

    const formattedVariants = variants
      .filter((v) => v.name.trim())
      .map((v) => ({
        name: v.name.trim(),
        pricePaise: Math.round((parseFloat(v.priceRupees) || 0) * 100),
        isActive: v.isActive,
      }));

    setIsSubmitting(true);
    try {
      await onSaveProduct({
        id: product?.id,
        name: name.trim(),
        categoryId,
        pricePaise: Math.round(priceNum * 100),
        isVeg,
        description: description.trim() || null,
        imageUrl,
        isSoldOut,
        isActive,
        sku: sku.trim() || null,
        prepTimeMin: parseInt(prepTimeMin, 10) || 10,
        variants: formattedVariants,
        addonGroupIds: assignedAddonGroupIds,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[#16845B]" />
            <span className="font-black text-sm text-slate-900">
              {product ? `Edit Product: ${product.name}` : "Create New Menu Product"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-slate-200 bg-white shrink-0 overflow-x-auto">
          {[
            { id: "GENERAL", label: "General Info", icon: Tag },
            { id: "PRICING", label: "Pricing & Variants", icon: DollarSign },
            { id: "MODIFIERS", label: `Add-ons (${assignedAddonGroupIds.length})`, icon: Layers },
            { id: "INVENTORY", label: "Recipe / Stock", icon: ChefHat },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer ${
                  isCurrent
                    ? "border-[#16845B] text-[#16845B]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: GENERAL INFO */}
          {activeTab === "GENERAL" && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paneer Butter Masala, Belgian Waffle..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#16845B]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#16845B] bg-white cursor-pointer"
                  >
                    <option value="">Select a category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Food Classification</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsVeg(true)}
                      className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border font-bold text-xs transition ${
                        isVeg
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                      Pure Veg
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsVeg(false)}
                      className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg border font-bold text-xs transition ${
                        !isVeg
                          ? "bg-rose-50 border-rose-500 text-rose-800"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Beef className="w-3.5 h-3.5 text-rose-600" />
                      Non-Veg
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">SKU / Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. BEV-001, PIZ-MED-04"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#16845B]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Est. Prep Time (mins)</label>
                  <input
                    type="number"
                    min="1"
                    value={prepTimeMin}
                    onChange={(e) => setPrepTimeMin(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#16845B]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Product Description</label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, flavour profile, serving size..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16845B]"
                />
              </div>

              {/* Product Image Upload */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Product Image</label>
                <MenuImageUpload
                  value={imageUrl}
                  onChange={(url) => setImageUrl(url)}
                  menuItemId={product?.id}
                />
              </div>

              {/* Status Toggles */}
              <div className="flex items-center gap-6 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="accent-[#16845B] w-4 h-4 rounded"
                  />
                  <span>Active in POS & Menu</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isSoldOut}
                    onChange={(e) => setIsSoldOut(e.target.checked)}
                    className="accent-rose-600 w-4 h-4 rounded"
                  />
                  <span className={isSoldOut ? "text-rose-600 font-bold" : ""}>
                    Mark Out-of-Stock
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: PRICING & VARIANTS */}
          {activeTab === "PRICING" && (
            <div className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Base Selling Price (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="250"
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#16845B]"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  GST rate (5%) will be calculated automatically at checkout based on restaurant settings.
                </p>
              </div>

              {/* Variants Section */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Product Variants / Portions
                    </span>
                    <span className="text-[11px] text-slate-500">
                      e.g. Half / Full, Regular / Large, 250ml / 500ml
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#16845B]" />
                    Add Variant
                  </button>
                </div>

                {variants.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic py-2 text-center">
                    No variants added. The product will sell at base price.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {variants.map((v, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200"
                      >
                        <input
                          type="text"
                          required
                          placeholder="Variant Name (e.g. Large)"
                          value={v.name}
                          onChange={(e) => handleVariantChange(idx, "name", e.target.value)}
                          className="flex-1 p-1.5 border border-slate-200 rounded text-xs font-semibold focus:outline-none"
                        />
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                            ₹
                          </span>
                          <input
                            type="number"
                            required
                            placeholder="Price"
                            value={v.priceRupees}
                            onChange={(e) => handleVariantChange(idx, "priceRupees", e.target.value)}
                            className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded text-xs font-bold focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove variant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MODIFIERS & ADD-ONS */}
          {activeTab === "MODIFIERS" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Link reusable modifier groups (e.g. Extra Toppings, Dips, Crusts) to this product.
                Modifiers selected here will appear on POS and QR ordering.
              </p>
              <ProductAddonManager
                menuItemId={product?.id || null}
                assignedGroupIds={assignedAddonGroupIds}
                onChangeAssignedGroupIds={(gIds) => setAssignedAddonGroupIds(gIds)}
                tenantId={tenantId}
              />
            </div>
          )}

          {/* TAB 4: RECIPE & INVENTORY LINKAGE */}
          {activeTab === "INVENTORY" && (
            <div className="space-y-3">
              {product?.recipe ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-bold text-slate-900 block">
                    Linked Recipe (Yield: {product.recipe.yieldQty} portion)
                  </span>
                  <div className="divide-y divide-slate-200">
                    {product.recipe.ingredients?.map((ing) => (
                      <div key={ing.id} className="py-1 flex justify-between">
                        <span>{ing.inventoryItem?.name}</span>
                        <span className="font-mono font-semibold">
                          {ing.quantity} {ing.inventoryItem?.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <ChefHat className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No Recipe Linked</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configure raw material recipe deductions under Inventory → Recipes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-slate-400">
              Changes preserve historical invoice records.
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-[#16845B] hover:bg-[#13734f] text-white font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {isSubmitting ? "Saving..." : product ? "Update Product" : "Create Product"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
