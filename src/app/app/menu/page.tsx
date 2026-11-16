"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import { MenuImageUpload } from "@/components/app/MenuImageUpload";
import {
  UtensilsCrossed,
  Edit2,
  Copy,
  Trash2,
  X,
  Search,
  Plus,
  AlertCircle,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { ProductAddonManager } from "@/components/app/ProductAddonManager";

interface MenuItemType {
  id: string;
  name: string;
  pricePaise: number;
  categoryId: string;
  isVeg: boolean;
  description?: string | null;
  imageUrl?: string | null;
  isSoldOut?: boolean;
  isActive?: boolean;
  category?: { id: string; name: string };
  addonLinks?: Array<{
    id: string;
    addonGroupId: string;
    addonGroup: {
      id: string;
      name: string;
      selectionType: string;
      isRequired: boolean;
      options: Array<{ id: string; name: string; pricePaise: number }>;
    };
  }>;
}

interface CategoryType {
  id: string;
  name: string;
  items?: MenuItemType[];
}

export default function MenuPage() {
  const [cats, setCats] = useState<CategoryType[]>([]);
  const [items, setItems] = useState<MenuItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // New Category State
  const [newCat, setNewCat] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // New Item State
  const [newItem, setNewItem] = useState<{
    name: string;
    price: string;
    categoryId: string;
    isVeg: boolean;
    description: string;
    imageUrl: string | null;
    addonGroupIds: string[];
  }>({
    name: "",
    price: "",
    categoryId: "",
    isVeg: true,
    description: "",
    imageUrl: null,
    addonGroupIds: [],
  });
  const [creatingItem, setCreatingItem] = useState(false);

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    price: string;
    categoryId: string;
    isVeg: boolean;
    description: string;
    imageUrl: string | null;
    isSoldOut: boolean;
    addonGroupIds: string[];
  }>({
    name: "",
    price: "",
    categoryId: "",
    isVeg: true,
    description: "",
    imageUrl: null,
    isSoldOut: false,
    addonGroupIds: [],
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Duplicate Item State
  const [duplicatingItem, setDuplicatingItem] = useState<MenuItemType | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateKeepImage, setDuplicateKeepImage] = useState(true);
  const [savingDuplicate, setSavingDuplicate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const j = await apiFetch("/api/menu").then((r) => r.json());
      if (j.categories) setCats(j.categories);
      else if (j.cats) setCats(j.cats);
      if (j.items) setItems(j.items);
    } catch {
      setMsg({ text: "Failed to load menu items", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createCat() {
    if (!newCat.trim()) return;
    setCreatingCat(true);
    try {
      const res = await apiFetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", name: newCat.trim() }),
      });
      if (res.ok) {
        setNewCat("");
        await load();
        setMsg({ text: "Category created successfully", type: "success" });
      } else {
        setMsg({ text: "Failed to create category", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error creating category", type: "error" });
    } finally {
      setCreatingCat(false);
    }
  }

  async function createItem() {
    if (!newItem.name.trim()) {
      setMsg({ text: "Item name is required", type: "error" });
      return;
    }
    if (!newItem.categoryId) {
      setMsg({ text: "Please select a category", type: "error" });
      return;
    }
    const priceNum = parseFloat(newItem.price || "0");
    if (isNaN(priceNum) || priceNum < 0) {
      setMsg({ text: "Please enter a valid price", type: "error" });
      return;
    }

    setCreatingItem(true);
    try {
      const paise = Math.round(priceNum * 100);
      const res = await apiFetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "item",
          name: newItem.name.trim(),
          pricePaise: paise,
          categoryId: newItem.categoryId,
          isVeg: newItem.isVeg,
          description: newItem.description.trim() || undefined,
          imageUrl: newItem.imageUrl || undefined,
          addonGroupIds: newItem.addonGroupIds,
        }),
      });

      if (res.ok) {
        setNewItem({
          name: "",
          price: "",
          categoryId: newItem.categoryId,
          isVeg: true,
          description: "",
          imageUrl: null,
          addonGroupIds: [],
        });
        await load();
        setMsg({ text: "Item created successfully with image", type: "success" });
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg({ text: err.error || "Failed to create item", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error creating item", type: "error" });
    } finally {
      setCreatingItem(false);
    }
  }

  function openEdit(item: MenuItemType) {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      price: (item.pricePaise / 100).toFixed(0),
      categoryId: item.categoryId,
      isVeg: item.isVeg,
      description: item.description || "",
      imageUrl: item.imageUrl || null,
      isSoldOut: !!item.isSoldOut,
      addonGroupIds: item.addonLinks?.map((l: any) => l.addonGroupId) || [],
    });
  }

  async function saveEdit() {
    if (!editingItem) return;
    if (!editForm.name.trim()) {
      setMsg({ text: "Item name is required", type: "error" });
      return;
    }
    setSavingEdit(true);
    try {
      const priceNum = parseFloat(editForm.price || "0");
      const paise = Math.round(priceNum * 100);

      const res = await apiFetch("/api/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          name: editForm.name.trim(),
          pricePaise: paise,
          categoryId: editForm.categoryId,
          isVeg: editForm.isVeg,
          description: editForm.description.trim() || null,
          imageUrl: editForm.imageUrl || null,
          isSoldOut: editForm.isSoldOut,
          addonGroupIds: editForm.addonGroupIds,
        }),
      });

      if (res.ok) {
        setEditingItem(null);
        await load();
        setMsg({ text: "Item updated successfully", type: "success" });
      } else {
        const err = await res.json().catch(() => ({}));
        setMsg({ text: err.error || "Failed to update item", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error updating item", type: "error" });
    } finally {
      setSavingEdit(false);
    }
  }

  function openDuplicate(item: MenuItemType) {
    setDuplicatingItem(item);
    setDuplicateName(`${item.name} (Copy)`);
    setDuplicateKeepImage(true);
  }

  async function saveDuplicate() {
    if (!duplicatingItem) return;
    if (!duplicateName.trim()) {
      setMsg({ text: "Name is required for duplicate", type: "error" });
      return;
    }
    setSavingDuplicate(true);
    try {
      const res = await apiFetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "item",
          name: duplicateName.trim(),
          pricePaise: duplicatingItem.pricePaise,
          categoryId: duplicatingItem.categoryId,
          isVeg: duplicatingItem.isVeg,
          description: duplicatingItem.description || undefined,
          imageUrl: duplicateKeepImage ? duplicatingItem.imageUrl : undefined,
        }),
      });

      if (res.ok) {
        setDuplicatingItem(null);
        await load();
        setMsg({ text: "Item duplicated successfully", type: "success" });
      } else {
        setMsg({ text: "Failed to duplicate item", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error duplicating item", type: "error" });
    } finally {
      setSavingDuplicate(false);
    }
  }

  async function deleteItem(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also remove associated storage images.`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/menu?id=${id}&type=item`, {
        method: "DELETE",
      });
      if (res.ok) {
        await load();
        setMsg({ text: `"${name}" deleted`, type: "success" });
      } else {
        setMsg({ text: "Failed to delete item", type: "error" });
      }
    } catch {
      setMsg({ text: "Network error deleting item", type: "error" });
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchesCategory =
        filter === "All" ||
        cats.find((c) => c.id === it.categoryId)?.name === filter;
      const matchesSearch =
        !searchQuery.trim() ||
        it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.description && it.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [items, filter, searchQuery, cats]);

  return (
    <div className="space-y-6 text-[#172B25] pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#172B25]">Universal Menu Management</h1>
          <p className="text-sm text-[#718078]">
            Manage food catalog, visuals, pricing, and category categorization across POS & QR ordering
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#E8F5EE] border border-[#E5EBE7] px-3.5 py-1 text-xs font-bold text-[#16845B]">
            {items.length} items • {cats.length} categories
          </span>
        </div>
      </div>

      {/* Status Alert */}
      {msg && (
        <div
          className={`flex items-center justify-between p-3 rounded-2xl border text-sm font-medium ${
            msg.type === "success"
              ? "bg-[#E8F5EE] border-[#16845B]/30 text-[#16845B]"
              : "bg-red-50 border-red-200 text-red-600"
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="p-1 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Forms on left, Items list on right */}
      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        {/* Left Column: Create forms */}
        <div className="space-y-6">
          {/* Add Category */}
          <Card className="bg-white border-[#E5EBE7] shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[#172B25]">Add Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Category name</Label>
                <Input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="e.g. Beverages, Starters"
                  className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
                  onKeyDown={(e) => e.key === "Enter" && createCat()}
                />
              </div>
              <button
                onClick={createCat}
                disabled={creatingCat || !newCat.trim()}
                className="w-full rounded-full border border-[#E5EBE7] bg-white text-[#172B25] py-2 text-sm font-bold hover:bg-[#F8FAF9] shadow-xs transition disabled:opacity-50"
              >
                {creatingCat ? "Creating..." : "Create Category"}
              </button>
              <div className="pt-2 flex flex-wrap gap-1.5">
                {cats.map((c) => (
                  <span
                    key={c.id}
                    className="rounded-full bg-[#F8FAF9] border border-[#E5EBE7] px-3 py-1 text-xs text-[#172B25] font-medium"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Add Menu Item */}
          <Card className="bg-white border-[#E5EBE7] shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[#172B25]">Add Menu Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Image Upload Dropzone */}
              <div>
                <Label className="text-[#718078] text-xs font-semibold mb-1 block">
                  Product Image (JPG, PNG, WebP)
                </Label>
                <MenuImageUpload
                  value={newItem.imageUrl}
                  onChange={(url) => setNewItem({ ...newItem, imageUrl: url })}
                />
              </div>

              {/* Item Name & Price */}
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div>
                  <Label className="text-[#718078] text-xs font-semibold">Item name *</Label>
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="e.g. Paneer Tikka"
                    className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[#718078] text-xs font-semibold">Price (₹) *</Label>
                  <Input
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="250"
                    type="number"
                    className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Category *</Label>
                <select
                  value={newItem.categoryId}
                  onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2.5 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none"
                >
                  <option value="">Select category</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Veg / Non-Veg Toggle */}
              <div>
                <Label className="text-[#718078] text-xs font-semibold mb-1 block">Dietary Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewItem({ ...newItem, isVeg: true })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      newItem.isVeg
                        ? "bg-[#E8F5EE] border-[#16845B] text-[#16845B] shadow-2xs"
                        : "bg-white border-[#E5EBE7] text-[#718078] hover:bg-[#F8FAF9]"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                    VEG
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewItem({ ...newItem, isVeg: false })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      !newItem.isVeg
                        ? "bg-red-50 border-red-500 text-red-600 shadow-2xs"
                        : "bg-white border-[#E5EBE7] text-[#718078] hover:bg-[#F8FAF9]"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                    NON-VEG
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Description (optional)</Label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Ingredients, flavors, allergen notice..."
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white p-2.5 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none"
                />
              </div>

              {/* Product Add-on Groups Configuration */}
              <div className="pt-2 border-t border-[#E5EBE7]">
                <ProductAddonManager
                  menuItemId={null}
                  assignedGroupIds={newItem.addonGroupIds}
                  onChangeAssignedGroupIds={(ids) => setNewItem({ ...newItem, addonGroupIds: ids })}
                />
              </div>

              <button
                onClick={createItem}
                disabled={creatingItem || !newItem.name.trim() || !newItem.categoryId}
                className="w-full rounded-full bg-[#16845B] py-2.5 text-sm font-bold text-white hover:bg-[#116B49] shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {creatingItem ? "Saving Item..." : "Create Menu Item"}
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Menu Items Visual Catalog */}
        <div className="space-y-4">
          <Card className="bg-white border-[#E5EBE7] shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base font-bold text-[#172B25]">Menu Catalog</CardTitle>
                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-[#718078] absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search menu..."
                    className="pl-9 bg-white border-[#E5EBE7] text-xs h-9 text-[#172B25]"
                  />
                </div>
              </div>

              {/* Categories Filter Tabs */}
              <div className="mt-3 flex gap-2 flex-wrap">
                {["All", ...cats.map((c) => c.name)].map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilter(c)}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold border transition ${
                      filter === c
                        ? "bg-[#16845B] text-white border-[#16845B] shadow-xs"
                        : "bg-white border-[#E5EBE7] text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-[#718078] py-12 text-center">Loading menu catalog...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-sm text-[#718078] py-12 text-center border border-dashed border-[#E5EBE7] rounded-2xl bg-[#F8FAF9]">
                  No items found. Create your first menu item using the form on the left.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredItems.map((it) => (
                    <div
                      key={it.id}
                      className="group rounded-2xl border border-[#E5EBE7] bg-white overflow-hidden hover:border-[#16845B] hover:shadow-sm transition flex flex-col justify-between"
                    >
                      {/* Product Visual Container */}
                      <div className="relative aspect-[16/10] bg-[#F8FAF9] overflow-hidden border-b border-[#E5EBE7]">
                        {it.imageUrl ? (
                          <img
                            src={it.imageUrl}
                            alt={it.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-[#718078]/60 bg-[#F8FAF9]">
                            <UtensilsCrossed className="w-8 h-8 stroke-1 text-[#16845B]/40 mb-1" />
                            <span className="text-[11px] font-semibold text-[#718078]/80">No image</span>
                          </div>
                        )}

                        {/* Top Left: Dietary Veg/Non-Veg Badge */}
                        <div className="absolute top-2.5 left-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs backdrop-blur-xs ${
                              it.isVeg
                                ? "bg-white/90 text-emerald-700 border border-emerald-200"
                                : "bg-white/90 text-red-700 border border-red-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                it.isVeg ? "bg-emerald-600" : "bg-red-600"
                              }`}
                            />
                            {it.isVeg ? "VEG" : "NON-VEG"}
                          </span>
                        </div>

                        {/* Top Right: Price Badge */}
                        <div className="absolute top-2.5 right-2.5">
                          <span className="rounded-full bg-white/95 border border-[#E5EBE7] px-2.5 py-0.5 text-xs font-black text-[#16845B] shadow-xs">
                            {formatINR(it.pricePaise)}
                          </span>
                        </div>

                        {/* Sold Out Overlay */}
                        {it.isSoldOut && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                            <span className="px-3 py-1 rounded-full bg-red-600 text-white font-extrabold text-xs tracking-wider">
                              SOLD OUT
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-semibold text-[#16845B]">
                            {cats.find((c) => c.id === it.categoryId)?.name || "Uncategorized"}
                          </div>
                          <h3 className="font-bold text-sm text-[#172B25] mt-0.5 line-clamp-1" title={it.name}>
                            {it.name}
                          </h3>
                          {it.description && (
                            <p className="text-xs text-[#718078] mt-1 line-clamp-2 leading-relaxed">
                              {it.description}
                            </p>
                          )}

                          {/* Add-on Groups Badges */}
                          {it.addonLinks && it.addonLinks.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {it.addonLinks.map((link) => (
                                <span
                                  key={link.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#E8F5EE] text-[#16845B] border border-[#16845B]/20"
                                >
                                  <Layers className="w-2.5 h-2.5" />
                                  {link.addonGroup?.name || "Add-on"}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions Toolbar */}
                        <div className="pt-3 mt-3 border-t border-[#E5EBE7] flex items-center justify-between gap-1">
                          <button
                            onClick={() => openEdit(it)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#172B25] hover:bg-[#F8FAF9] border border-transparent hover:border-[#E5EBE7] flex items-center gap-1 transition"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#16845B]" />
                            Edit
                          </button>
                          <button
                            onClick={() => openDuplicate(it)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#718078] hover:text-[#172B25] hover:bg-[#F8FAF9] flex items-center gap-1 transition"
                            title="Duplicate product"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Duplicate
                          </button>
                          <button
                            onClick={() => deleteItem(it.id, it.name)}
                            className="p-1 rounded-lg text-[#718078] hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete product and images"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5EBE7] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EBE7]">
              <div>
                <h2 className="text-lg font-black text-[#172B25]">Edit Menu Item</h2>
                <p className="text-xs text-[#718078]">Update details, image, or pricing</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full bg-[#F8FAF9] text-[#718078] hover:text-[#172B25] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Image Editor */}
              <div>
                <Label className="text-[#718078] text-xs font-semibold mb-1 block">
                  Product Image (JPG, PNG, WebP)
                </Label>
                <MenuImageUpload
                  value={editForm.imageUrl}
                  onChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
                  menuItemId={editingItem.id}
                />
              </div>

              {/* Name & Price */}
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div>
                  <Label className="text-[#718078] text-xs font-semibold">Item name *</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[#718078] text-xs font-semibold">Price (₹) *</Label>
                  <Input
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    type="number"
                    className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Category *</Label>
                <select
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white px-3 py-2.5 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none"
                >
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Veg / Non-Veg Toggle */}
              <div>
                <Label className="text-[#718078] text-xs font-semibold mb-1 block">Dietary Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isVeg: true })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      editForm.isVeg
                        ? "bg-[#E8F5EE] border-[#16845B] text-[#16845B]"
                        : "bg-white border-[#E5EBE7] text-[#718078]"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                    VEG
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, isVeg: false })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      !editForm.isVeg
                        ? "bg-red-50 border-red-500 text-red-600"
                        : "bg-white border-[#E5EBE7] text-[#718078]"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                    NON-VEG
                  </button>
                </div>
              </div>

              {/* Sold Out Availability Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#E5EBE7] bg-[#F8FAF9]">
                <div>
                  <div className="text-xs font-bold text-[#172B25]">Mark as Sold Out</div>
                  <div className="text-[11px] text-[#718078]">Hide or disable item on POS & QR ordering</div>
                </div>
                <input
                  type="checkbox"
                  checked={editForm.isSoldOut}
                  onChange={(e) => setEditForm({ ...editForm, isSoldOut: e.target.checked })}
                  className="w-4 h-4 accent-[#16845B] rounded cursor-pointer"
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-[#718078] text-xs font-semibold">Description</Label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-[#E5EBE7] bg-white p-2.5 text-sm text-[#172B25] focus:border-[#16845B] focus:outline-none"
                />
              </div>

              {/* Product Add-on Groups Configuration */}
              <div className="pt-2 border-t border-[#E5EBE7]">
                <ProductAddonManager
                  menuItemId={editingItem?.id}
                  assignedGroupIds={editForm.addonGroupIds}
                  onChangeAssignedGroupIds={(ids) => setEditForm({ ...editForm, addonGroupIds: ids })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#E5EBE7]">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="flex-1 py-2.5 rounded-full border border-[#E5EBE7] text-[#718078] font-bold text-xs hover:bg-[#F8FAF9] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit || !editForm.name.trim()}
                className="flex-1 py-2.5 rounded-full bg-[#16845B] text-white font-bold text-xs hover:bg-[#116B49] transition disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Item Modal */}
      {duplicatingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5EBE7] max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5EBE7]">
              <h2 className="text-base font-black text-[#172B25]">Duplicate Product</h2>
              <button
                onClick={() => setDuplicatingItem(null)}
                className="w-7 h-7 rounded-full bg-[#F8FAF9] text-[#718078] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-[#718078] text-xs font-semibold">New Item Name</Label>
                <Input
                  value={duplicateName}
                  onChange={(e) => setDuplicateName(e.target.value)}
                  className="mt-1 bg-white border-[#E5EBE7] text-[#172B25] text-sm"
                />
              </div>

              {duplicatingItem.imageUrl && (
                <div className="p-3 rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] space-y-2">
                  <div className="text-xs font-bold text-[#172B25]">Product Image Choice</div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#172B25]">
                    <input
                      type="radio"
                      name="dupImage"
                      checked={duplicateKeepImage}
                      onChange={() => setDuplicateKeepImage(true)}
                      className="accent-[#16845B]"
                    />
                    <span>Reuse existing image from original item</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#172B25]">
                    <input
                      type="radio"
                      name="dupImage"
                      checked={!duplicateKeepImage}
                      onChange={() => setDuplicateKeepImage(false)}
                      className="accent-[#16845B]"
                    />
                    <span>Start without image (upload later)</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuplicatingItem(null)}
                className="flex-1 py-2.5 rounded-full border border-[#E5EBE7] text-[#718078] font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDuplicate}
                disabled={savingDuplicate || !duplicateName.trim()}
                className="flex-1 py-2.5 rounded-full bg-[#16845B] text-white font-bold text-xs hover:bg-[#116B49] disabled:opacity-50"
              >
                {savingDuplicate ? "Duplicating..." : "Confirm Duplicate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
