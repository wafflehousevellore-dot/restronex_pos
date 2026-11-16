"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/money";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  DollarSign,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AddonOptionData {
  id?: string;
  name: string;
  pricePaise: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface AddonGroupData {
  id: string;
  name: string;
  description?: string | null;
  selectionType: "SINGLE" | "MULTIPLE";
  minSelections: number;
  maxSelections?: number | null;
  isRequired: boolean;
  isActive: boolean;
  options: AddonOptionData[];
}

interface ProductAddonManagerProps {
  menuItemId?: string | null; // null if creating a new item
  assignedGroupIds: string[];
  onChangeAssignedGroupIds: (groupIds: string[]) => void;
  tenantId?: string;
}

export function ProductAddonManager({
  menuItemId,
  assignedGroupIds,
  onChangeAssignedGroupIds,
  tenantId,
}: ProductAddonManagerProps) {
  const [allGroups, setAllGroups] = useState<AddonGroupData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AddonGroupData | null>(null);

  // Group Form State
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [selectionType, setSelectionType] = useState<"SINGLE" | "MULTIPLE">("MULTIPLE");
  const [isRequired, setIsRequired] = useState(false);
  const [minSelections, setMinSelections] = useState(0);
  const [maxSelections, setMaxSelections] = useState<string>("");
  const [options, setOptions] = useState<
    Array<{ id?: string; name: string; price: string; isDefault: boolean; isActive: boolean }>
  >([
    { name: "", price: "0", isDefault: false, isActive: true },
  ]);
  const [savingGroup, setSavingGroup] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load all tenant add-on groups
  async function loadGroups() {
    setLoading(true);
    try {
      const url = tenantId ? `/api/menu/addons?tenantId=${tenantId}` : "/api/menu/addons";
      const res = await apiFetch(url);
      const data = await res.json();
      if (res.ok && Array.isArray(data.groups)) {
        setAllGroups(data.groups);
      }
    } catch {
      console.warn("Failed to load add-on groups");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, [tenantId]);

  function openCreateModal() {
    setEditingGroup(null);
    setGroupName("");
    setGroupDesc("");
    setSelectionType("MULTIPLE");
    setIsRequired(false);
    setMinSelections(0);
    setMaxSelections("");
    setOptions([
      { name: "", price: "0", isDefault: false, isActive: true },
      { name: "", price: "0", isDefault: false, isActive: true },
    ]);
    setErrorMsg(null);
    setIsCreateModalOpen(true);
  }

  function openEditModal(group: AddonGroupData) {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDesc(group.description || "");
    setSelectionType(group.selectionType);
    setIsRequired(group.isRequired);
    setMinSelections(group.minSelections);
    setMaxSelections(group.maxSelections ? String(group.maxSelections) : "");
    setOptions(
      group.options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        price: (opt.pricePaise / 100).toFixed(0),
        isDefault: Boolean(opt.isDefault),
        isActive: opt.isActive !== false,
      }))
    );
    setErrorMsg(null);
    setIsCreateModalOpen(true);
  }

  function addOptionRow() {
    setOptions([...options, { name: "", price: "0", isDefault: false, isActive: true }]);
  }

  function removeOptionRow(idx: number) {
    if (options.length <= 1) return;
    setOptions(options.filter((_, i) => i !== idx));
  }

  async function handleSaveGroup() {
    if (!groupName.trim()) {
      setErrorMsg("Group name is required (e.g. Extra Toppings, Ice Cream)");
      return;
    }

    const validOptions = options.filter((o) => o.name.trim().length > 0);
    if (validOptions.length === 0) {
      setErrorMsg("Please add at least one option");
      return;
    }

    setSavingGroup(true);
    setErrorMsg(null);
    try {
      if (editingGroup) {
        // Update existing group
        const res = await apiFetch("/api/menu/addons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingGroup.id,
            name: groupName.trim(),
            description: groupDesc.trim() || null,
            selectionType,
            isRequired,
            minSelections: Number(minSelections) || 0,
            maxSelections: maxSelections ? Number(maxSelections) : null,
            options: validOptions.map((opt) => ({
              id: opt.id,
              name: opt.name.trim(),
              pricePaise: Math.round((parseFloat(opt.price || "0") || 0) * 100),
              isDefault: opt.isDefault,
              isActive: opt.isActive,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update group");
      } else {
        // Create new group
        const res = await apiFetch("/api/menu/addons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_group",
            name: groupName.trim(),
            description: groupDesc.trim() || null,
            selectionType,
            isRequired,
            minSelections: Number(minSelections) || 0,
            maxSelections: maxSelections ? Number(maxSelections) : null,
            menuItemId: menuItemId || undefined,
            options: validOptions.map((opt) => ({
              name: opt.name.trim(),
              pricePaise: Math.round((parseFloat(opt.price || "0") || 0) * 100),
              isDefault: opt.isDefault,
              isActive: opt.isActive,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create group");

        if (data.group?.id && !assignedGroupIds.includes(data.group.id)) {
          onChangeAssignedGroupIds([...assignedGroupIds, data.group.id]);
        }
      }

      await loadGroups();
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save add-on group");
    } finally {
      setSavingGroup(false);
    }
  }

  function toggleGroupAssignment(groupId: string) {
    if (assignedGroupIds.includes(groupId)) {
      onChangeAssignedGroupIds(assignedGroupIds.filter((id) => id !== groupId));
    } else {
      onChangeAssignedGroupIds([...assignedGroupIds, groupId]);
    }
  }

  const assignedGroups = allGroups.filter((g) => assignedGroupIds.includes(g.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-[#172B25] text-xs font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#16845B]" />
            Add-ons &amp; Customization Groups ({assignedGroups.length})
          </label>
          <p className="text-[11px] text-[#718078]">
            Configure extra toppings, ice creams, sauces, or zero-price instructions.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreateModal}
          size="sm"
          className="rounded-xl bg-[#E8F5EE] hover:bg-[#d8ede1] text-[#16845B] border border-[#16845B]/30 text-xs font-bold h-7 gap-1 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          New Add-on Group
        </Button>
      </div>

      {/* Assigned Groups Card List */}
      {assignedGroups.length > 0 ? (
        <div className="space-y-2">
          {assignedGroups.map((group) => (
            <div
              key={group.id}
              className="p-3 rounded-2xl border border-[#E5EBE7] bg-[#F8FAF9] hover:bg-[#F3F7F5] transition flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-xs text-[#172B25]">{group.name}</span>
                  {group.isRequired ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Required
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                      Optional
                    </span>
                  )}
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {group.selectionType === "SINGLE" ? "Single Choice" : "Multi Choice"}
                  </span>
                  {group.maxSelections && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800">
                      Max {group.maxSelections}
                    </span>
                  )}
                </div>

                {/* Options Pills */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {group.options.map((opt) => (
                    <span
                      key={opt.id || opt.name}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-[#E5EBE7] text-[11px] text-[#172B25]"
                    >
                      <span>{opt.name}</span>
                      <span className="font-bold text-[#16845B]">
                        {opt.pricePaise > 0 ? `+${formatINR(opt.pricePaise)}` : "Free"}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => openEditModal(group)}
                  className="p-1 rounded-lg text-[#718078] hover:text-[#16845B] hover:bg-white transition"
                  title="Edit Group"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleGroupAssignment(group.id)}
                  className="p-1 rounded-lg text-[#718078] hover:text-red-600 hover:bg-white transition"
                  title="Detach from product"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl border border-dashed border-[#D2DFD8] bg-[#F8FAF9] text-center">
          <p className="text-xs text-[#718078]">
            No add-on groups linked to this product yet.
          </p>
        </div>
      )}

      {/* Quick Attach Existing Library Groups Selector */}
      {allGroups.length > 0 && (
        <div className="pt-1">
          <label className="text-[11px] font-bold text-[#718078] uppercase tracking-wider block mb-1.5">
            Attach Existing Library Groups
          </label>
          <div className="flex flex-wrap gap-1.5">
            {allGroups.map((g) => {
              const isAssigned = assignedGroupIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroupAssignment(g.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                    isAssigned
                      ? "bg-[#16845B] text-white border-[#16845B] shadow-2xs"
                      : "bg-white text-[#172B25] border-[#E5EBE7] hover:bg-[#F8FAF9]"
                  }`}
                >
                  {isAssigned && <Check className="w-3.5 h-3.5" />}
                  <span>{g.name}</span>
                  <span className={isAssigned ? "text-emerald-200" : "text-[#718078]"}>
                    ({g.options.length})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Add-on Group */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5EBE7] max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5EBE7]">
              <div>
                <h3 className="font-extrabold text-base text-[#172B25]">
                  {editingGroup ? "Edit Add-on Group" : "Create Add-on Group"}
                </h3>
                <p className="text-xs text-[#718078]">
                  e.g. Extra Toppings, Ice Cream, Custom Instructions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F8FAF9] text-[#718078] hover:text-[#172B25] grid place-items-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-3.5">
              {/* Group Name & Description */}
              <div>
                <label className="text-xs font-semibold text-[#718078]">Group Name *</label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Extra Toppings, Ice Cream, Size"
                  className="mt-1 text-sm bg-white border-[#E5EBE7]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#718078]">Description (optional)</label>
                <Input
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="e.g. Choose up to 3 toppings"
                  className="mt-1 text-xs bg-white border-[#E5EBE7]"
                />
              </div>

              {/* Selection Rules: Single vs Multi */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectionType("MULTIPLE")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
                    selectionType === "MULTIPLE"
                      ? "bg-[#E8F5EE] border-[#16845B] text-[#16845B]"
                      : "bg-white border-[#E5EBE7] text-[#718078]"
                  }`}
                >
                  <span>Multi-Choice</span>
                  <span className="text-[10px] font-normal text-[#718078]">
                    Customer can pick multiple
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionType("SINGLE")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
                    selectionType === "SINGLE"
                      ? "bg-[#E8F5EE] border-[#16845B] text-[#16845B]"
                      : "bg-white border-[#E5EBE7] text-[#718078]"
                  }`}
                >
                  <span>Single-Choice</span>
                  <span className="text-[10px] font-normal text-[#718078]">
                    Pick exactly one (e.g. Flavor)
                  </span>
                </button>
              </div>

              {/* Mandatory / Optional & Limits */}
              <div className="p-3 rounded-2xl bg-[#F8FAF9] border border-[#E5EBE7] space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#172B25] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="rounded border-[#D2DFD8] text-[#16845B] focus:ring-[#16845B]"
                  />
                  <span>Mandatory Selection (Customer must choose)</span>
                </label>

                {selectionType === "MULTIPLE" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-[#718078]">Min Selections</label>
                      <Input
                        type="number"
                        min="0"
                        value={minSelections}
                        onChange={(e) => setMinSelections(Math.max(0, parseInt(e.target.value) || 0))}
                        className="mt-1 h-8 text-xs bg-white border-[#E5EBE7]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#718078]">Max Selections</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="No limit"
                        value={maxSelections}
                        onChange={(e) => setMaxSelections(e.target.value)}
                        className="mt-1 h-8 text-xs bg-white border-[#E5EBE7]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Options Table */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#172B25]">
                    Options &amp; Prices ({options.length})
                  </label>
                  <button
                    type="button"
                    onClick={addOptionRow}
                    className="text-xs font-bold text-[#16845B] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Option
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={opt.name}
                        onChange={(e) => {
                          const updated = [...options];
                          updated[idx].name = e.target.value;
                          setOptions(updated);
                        }}
                        placeholder={`e.g. Option ${idx + 1}`}
                        className="text-xs bg-white border-[#E5EBE7] flex-1 h-9"
                      />
                      <div className="w-24 relative">
                        <span className="absolute left-2.5 top-2.5 text-xs text-[#718078]">₹</span>
                        <Input
                          type="number"
                          min="0"
                          value={opt.price}
                          onChange={(e) => {
                            const updated = [...options];
                            updated[idx].price = e.target.value;
                            setOptions(updated);
                          }}
                          className="pl-6 text-xs bg-white border-[#E5EBE7] h-9"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOptionRow(idx)}
                        disabled={options.length <= 1}
                        className="p-2 rounded-lg text-[#718078] hover:text-red-600 hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                        title="Delete option"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-3 border-t border-[#E5EBE7]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 rounded-full border-[#E5EBE7] text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={savingGroup}
                onClick={handleSaveGroup}
                className="flex-1 rounded-full bg-[#16845B] hover:bg-[#116B49] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {savingGroup ? "Saving..." : editingGroup ? "Update Group" : "Create & Attach"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
