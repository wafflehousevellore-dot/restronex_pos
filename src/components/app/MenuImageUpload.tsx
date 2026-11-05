"use client";

import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadCloud, X, RefreshCw, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { validateImageFile, compressAndOptimizeImage } from "@/lib/image-utils";

interface MenuImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  menuItemId?: string;
  disabled?: boolean;
}

export function MenuImageUpload({
  value,
  onChange,
  menuItemId,
  disabled = false,
}: MenuImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = value || null;

  async function handleFile(file: File) {
    setError(null);
    setSuccess(null);

    // 1. Validation
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid image file.");
      return;
    }

    try {
      setUploading(true);
      setProgress(25);

      // 2. Client-side compression & WebP conversion
      const optimizedBlob = await compressAndOptimizeImage(file, 1000, 1000, 0.85);
      setProgress(50);

      // 3. Prepare FormData
      const formData = new FormData();
      formData.append(
        "file",
        optimizedBlob,
        file.name.replace(/\.[^/.]+$/, "") + ".webp"
      );
      if (menuItemId) {
        formData.append("menuItemId", menuItemId);
      }
      if (value) {
        formData.append("replaceUrl", value);
      }

      setProgress(75);

      // 4. Upload to API
      const res = await fetch("/api/menu/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed. Please try again.");
      }

      setProgress(100);
      onChange(data.url);
      setSuccess("Image uploaded successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err?.message || "An error occurred while uploading.");
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    if (disabled || uploading) return;

    const currentUrl = value;
    onChange(null);
    setError(null);
    setSuccess(null);

    if (currentUrl) {
      try {
        await fetch("/api/menu/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: currentUrl,
            menuItemId,
          }),
        });
      } catch (err) {
        console.warn("Storage deletion notification:", err);
      }
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={onFileInputChange}
        disabled={disabled || uploading}
      />

      {previewUrl ? (
        <div className="relative group rounded-2xl overflow-hidden border border-[#E5EBE7] bg-[#F8FAF9] aspect-[16/9] flex items-center justify-center">
          <img
            src={previewUrl}
            alt="Product preview"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          />

          {/* Overlay controls */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="px-3 py-1.5 rounded-full bg-white text-[#172B25] text-xs font-bold hover:bg-[#F8FAF9] flex items-center gap-1.5 shadow-md transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold hover:bg-red-700 flex items-center gap-1.5 shadow-md transition"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>

          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
              <RefreshCw className="w-6 h-6 animate-spin mb-2" />
              <span className="text-xs font-bold">Uploading {progress}%...</span>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[130px] ${
            isDragging
              ? "border-[#16845B] bg-[#E8F5EE]/40"
              : "border-[#E5EBE7] bg-[#F8FAF9] hover:border-[#16845B] hover:bg-white"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <RefreshCw className="w-6 h-6 text-[#16845B] animate-spin" />
              <div className="w-32 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#16845B] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress || 30}%` }}
                />
              </div>
              <p className="text-xs font-bold text-[#172B25]">Optimizing & Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
              <div className="w-10 h-10 rounded-full bg-white border border-[#E5EBE7] shadow-2xs flex items-center justify-center text-[#16845B]">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-[#172B25]">
                Click or drag & drop food image
              </div>
              <div className="text-[11px] text-[#718078]">
                JPG, PNG, WebP up to 5MB (auto-compressed)
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-1.5 text-xs text-[#16845B] bg-[#E8F5EE] border border-[#16845B]/30 rounded-xl p-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}

