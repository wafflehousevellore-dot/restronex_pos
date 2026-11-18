"use client";

import React, { useState, useEffect } from "react";
import { CategoryData } from "./MenuCategorySidebar";
import { X, FolderTree, AlertTriangle, Trash2, Check } from "lucide-react";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryData | null; // null for create, object for edit
  allCategories: CategoryData[];
  onSaveCategory: (data: {
    id?: string;
    name: string;
    slug?: string;
    sortOrder?: number;
    isActive?: boolean;
    imageUrl?: string | null;
  }) => Promise<void>;
  onDeleteCategoryWithReassign?: (categoryId: string, reassignToId?: string) => Promise<void>;
}

export function CategoryModal({
  isOpen,
  onClose,
  category,
  allCategories,
  onSaveCategory,
  onDeleteCategoryWithReassign,
}: CategoryModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion flow with safe reassignment
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reassignCategoryId, setReassignCategoryId] = useState("");

  const assignedProductsCount = category?.items?.length || 0;
  const otherCategories = allCategories.filter((c) => c.id !== category?.id);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setSlug(category.slug || "");
      setSortOrder(String(category.sortOrder ?? 0));
      setIsActive(category.isActive ?? true);
      setImageUrl(category.imageUrl || "");
    } else {
      setName("");
      setSlug("");
      setSortOrder("0");
      setIsActive(true);
      setImageUrl("");
    }
    setShowDeleteConfirm(false);
    setReassignCategoryId("");
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSaveCategory({
        id: category?.id,
        name: name.trim(),
        slug: slug.trim() || undefined,
        sortOrder: Number(sortOrder) || 0,
        isActive,
        imageUrl: imageUrl.trim() || null,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!category || !onDeleteCategoryWithReassign) return;
    setIsSubmitting(true);
    try {
      await onDeleteCategoryWithReassign(
        category.id,
        reassignCategoryId ? reassignCategoryId : undefined
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-[#16845B]" />
            <span className="font-bold text-sm text-slate-900">
              {category ? `Edit Category: ${category.name}` : "Create New Category"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Delete Confirmation View */}
        {showDeleteConfirm ? (
          <div className="p-4 space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-4 h-4" />
                Category Deletion Protection
              </span>
              <p>
                Are you sure you want to delete category <strong>{category?.name}</strong>?
              </p>
            </div>

            {assignedProductsCount > 0 ? (
              <div className="space-y-2">
                <p className="font-semibold text-slate-700">
                  This category contains <strong>{assignedProductsCount} products</strong>. Choose
                  a category to safely reassign them to before deletion:
                </p>
                <select
                  value={reassignCategoryId}
                  onChange={(e) => setReassignCategoryId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#16845B]"
                >
                  <option value="">Select target category to reassign...</option>
                  {otherCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-slate-600">
                No products are currently assigned to this category. It can be deleted safely.
              </p>
            )}

            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting || (assignedProductsCount > 0 && !reassignCategoryId)}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Confirm & Delete"}
              </button>
            </div>
          </div>
        ) : (
          /* Normal Form */
          <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Category Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Starters, Main Course, Beverages..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#16845B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Display Sort Order</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#16845B]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Status</label>
                <div className="flex items-center gap-2 pt-1.5">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="accent-[#16845B] w-4 h-4 rounded"
                    />
                    <span>Active Category</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Image URL (Optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#16845B]"
              />
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              {category ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-[#16845B] hover:bg-[#13734f] text-white font-bold transition shadow-xs"
                >
                  {isSubmitting ? "Saving..." : category ? "Update Category" : "Create Category"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
