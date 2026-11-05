/**
 * Client-side Image Optimization and Validation Utilities for RestroNex
 */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates file MIME type and file size before upload.
 */
export function validateImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  const isValidType = ALLOWED_IMAGE_TYPES.some((type) =>
    file.type.toLowerCase().includes(type.replace("image/", ""))
  );

  if (!isValidType) {
    return {
      valid: false,
      error: "Invalid file type. Supported formats: JPG, PNG, and WebP.",
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the 5 MB limit.`,
    };
  }

  return { valid: true };
}

/**
 * Resizes and compresses an image in the browser using HTML5 Canvas.
 * Produces an optimized WebP or JPEG blob for lightning-fast uploads and zero POS lag.
 */
export async function compressAndOptimizeImage(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.82
): Promise<Blob> {
  // If running outside browser (SSR), return raw file
  if (typeof window === "undefined" || !window.HTMLCanvasElement) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Calculate aspect ratio preserving bounds
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          maxHeight = height;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback to original file if 2d context fails
        resolve(file);
        return;
      }

      // Smooth image rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP with fallback to original MIME or JPEG
      const targetMime = "image/webp";

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback to JPEG if WebP blob generation fails
            canvas.toBlob(
              (fallbackBlob) => {
                resolve(fallbackBlob || file);
              },
              "image/jpeg",
              quality
            );
          }
        },
        targetMime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load and process image."));
    };

    img.src = objectUrl;
  });
}
