import { NextRequest, NextResponse } from "next/server";
import { getSession, resolveTenantId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appCache } from "@/lib/cache";
import {
  uploadTenantFile,
  deleteTenantFile,
  STORAGE_BUCKETS,
  extractStoragePath,
} from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/menu/upload
 * Multi-tenant aware image upload to Supabase Storage with MIME & size validation,
 * automatic cleanup of previous images, and optional menuItem link.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const menuItemId = formData.get("menuItemId") as string | null;
    const replaceUrl = formData.get("replaceUrl") as string | null;
    const requestedTenantId = formData.get("tenantId") as string | null;

    const tenantId = await resolveTenantId(userId, requestedTenantId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required." }, { status: 400 });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId, tenantId },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not a member of this tenant." }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // 1. MIME type validation
    const fileMime = file.type?.toLowerCase() || "";
    if (!ALLOWED_MIME_TYPES.has(fileMime)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only JPG, PNG, and WebP images are allowed.",
        },
        { status: 400 }
      );
    }

    // 2. File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 5MB maximum allowed size." },
        { status: 400 }
      );
    }

    // 3. Delete previous image if replaceUrl provided
    if (replaceUrl) {
      try {
        await deleteTenantFile(tenantId, replaceUrl, STORAGE_BUCKETS.PUBLIC_ASSETS);
      } catch (err: any) {
        console.warn("Notice: Old image replacement cleanup:", err?.message);
      }
    }

    // 4. Generate unique, clean filename
    const originalExt = file.name?.split(".").pop()?.toLowerCase() || "";
    const cleanExt = ["webp", "png", "jpg", "jpeg"].includes(originalExt)
      ? originalExt
      : fileMime === "image/png"
      ? "png"
      : fileMime === "image/webp"
      ? "webp"
      : "jpg";

    const fileName = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Upload via tenant-isolated Supabase storage
    const uploadResult = await uploadTenantFile(
      tenantId,
      fileName,
      buffer,
      {
        bucket: STORAGE_BUCKETS.PUBLIC_ASSETS,
        folder: "menu",
        contentType: fileMime || "image/webp",
        upsert: true,
      }
    );

    // 6. Link to MenuItem if provided
    if (menuItemId) {
      const existingItem = await prisma.menuItem.findFirst({
        where: { id: menuItemId, tenantId },
      });

      if (existingItem) {
        // Cleanup old image if different and not already cleaned
        if (
          existingItem.imageUrl &&
          existingItem.imageUrl !== uploadResult.url &&
          (!replaceUrl || existingItem.imageUrl !== replaceUrl)
        ) {
          try {
            await deleteTenantFile(tenantId, existingItem.imageUrl, STORAGE_BUCKETS.PUBLIC_ASSETS);
          } catch (e: any) {
            console.warn("Notice: Replaced menuItem image cleanup:", e?.message);
          }
        }

        await prisma.menuItem.update({
          where: { id: menuItemId },
          data: { imageUrl: uploadResult.url },
        });
      }
    }

    // 7. Invalidate caches for POS and QR menus
    appCache.del(`menu_api_${tenantId}`);
    appCache.del(`qr_menu_${tenantId}`);

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      path: uploadResult.path,
    });
  } catch (error: any) {
    console.error("Menu image upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during upload." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/menu/upload
 * Multi-tenant safe deletion of menu image and optional database detachment.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await getSession();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { imageUrl, menuItemId, tenantId: requestedTenantId } = body;

    const tenantId = await resolveTenantId(userId, requestedTenantId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required." }, { status: 400 });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId, tenantId },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not a member of this tenant." }, { status: 403 });
    }

    let targetUrl = imageUrl;

    if (menuItemId) {
      const existingItem = await prisma.menuItem.findFirst({
        where: { id: menuItemId, tenantId },
      });
      if (existingItem) {
        targetUrl = targetUrl || existingItem.imageUrl;
        await prisma.menuItem.update({
          where: { id: menuItemId },
          data: { imageUrl: null },
        });
      }
    }

    if (targetUrl) {
      const path = extractStoragePath(targetUrl, STORAGE_BUCKETS.PUBLIC_ASSETS);
      if (path && path.startsWith(`${tenantId}/`)) {
        await deleteTenantFile(tenantId, targetUrl, STORAGE_BUCKETS.PUBLIC_ASSETS);
      }
    }

    appCache.del(`menu_api_${tenantId}`);
    appCache.del(`qr_menu_${tenantId}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Menu image delete error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during deletion." },
      { status: 500 }
    );
  }
}

