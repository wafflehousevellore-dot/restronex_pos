import { createSupabaseAdminClient, createClerkSupabaseClient } from "./supabase";

/**
 * RestroNex Supabase Storage Manager
 * 
 * Manages tenant-specific file storage with strict tenant path isolation:
 * - Public bucket: `restaurant-assets` (logos, public menu images) -> `${tenantId}/menu/${file}`
 * - Private bucket: `restaurant-documents` (tax documents, receipts, reports) -> `${tenantId}/docs/${file}`
 */

export const STORAGE_BUCKETS = {
  PUBLIC_ASSETS: "restaurant-assets",
  PRIVATE_DOCS: "restaurant-documents",
} as const;

export interface UploadOptions {
  bucket?: keyof typeof STORAGE_BUCKETS | string;
  folder?: "logos" | "menu" | "receipts" | "reports" | "general";
  contentType?: string;
  upsert?: boolean;
}

/**
 * Upload a file on behalf of a tenant with automatic tenant directory isolation.
 */
export async function uploadTenantFile(
  tenantId: string,
  fileName: string,
  fileData: Buffer | Uint8Array | Blob | File,
  options: UploadOptions = {},
  clerkToken?: string | null
) {
  if (!tenantId) {
    throw new Error("Tenant ID is required for storage uploads.");
  }

  const bucket = options.bucket || STORAGE_BUCKETS.PUBLIC_ASSETS;
  const folder = options.folder || "general";
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${tenantId}/${folder}/${Date.now()}_${sanitizedFileName}`;

  const client = clerkToken ? createClerkSupabaseClient(clerkToken) : createSupabaseAdminClient();

  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, fileData, {
      contentType: options.contentType,
      upsert: options.upsert ?? true,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  // Generate public or signed URL depending on bucket
  if (bucket === STORAGE_BUCKETS.PUBLIC_ASSETS) {
    const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(filePath);
    return {
      path: data.path,
      url: publicUrlData.publicUrl,
    };
  }

  // Private document bucket: return signed URL with 1-hour expiry
  const { data: signedData, error: signError } = await client.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600);

  if (signError) {
    throw new Error(`Failed to create signed URL: ${signError.message}`);
  }

  return {
    path: data.path,
    url: signedData.signedUrl,
  };
}

/**
 * Delete a tenant file ensuring the path belongs to the tenant.
 */
export async function deleteTenantFile(
  tenantId: string,
  filePath: string,
  bucket: string = STORAGE_BUCKETS.PUBLIC_ASSETS,
  clerkToken?: string | null
) {
  if (!filePath.startsWith(`${tenantId}/`)) {
    throw new Error("Security violation: Cannot delete a file belonging to another tenant.");
  }

  const client = clerkToken ? createClerkSupabaseClient(clerkToken) : createSupabaseAdminClient();
  const { error } = await client.storage.from(bucket).remove([filePath]);

  if (error) {
    throw new Error(`Supabase Storage deletion failed: ${error.message}`);
  }

  return { success: true };
}

/**
 * Get signed download URL for private tenant document.
 */
export async function getTenantDocumentUrl(
  tenantId: string,
  filePath: string,
  expiresInSeconds: number = 3600,
  clerkToken?: string | null
) {
  if (!filePath.startsWith(`${tenantId}/`)) {
    throw new Error("Security violation: Cannot access files outside active tenant.");
  }

  const client = clerkToken ? createClerkSupabaseClient(clerkToken) : createSupabaseAdminClient();
  const { data, error } = await client.storage
    .from(STORAGE_BUCKETS.PRIVATE_DOCS)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    throw new Error(`Failed to generate signed document URL: ${error.message}`);
  }

  return data.signedUrl;
}
