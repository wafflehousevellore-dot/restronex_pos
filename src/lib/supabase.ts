import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * RestroNex Official Supabase Client Architecture
 * 
 * Configured with Clerk native third-party authentication:
 * - Browser/Client Components: Pass Clerk JWT token (generated via `getToken({ template: "supabase" })`)
 * - Server Route Handlers / Actions: Use Clerk user session or Admin Service Role for webhooks
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Creates a Supabase client authenticated with the user's Clerk session token.
 * This triggers PostgreSQL Row Level Security (RLS) using the Clerk JWT claims (`sub`, `tenant_id`).
 */
export function createClerkSupabaseClient(clerkToken?: string | null): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {},
    },
  });
}

/**
 * Server-side Admin Supabase client with Service Role privileges.
 * Used exclusively for system operations, server-verified webhooks (Razorpay, Clerk),
 * and background synchronizations that manage multi-tenant lifecycle before user session exists.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    // Graceful fallback for development / testing environments
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Tenant-scoped client helper that attaches tenant context to Supabase queries.
 */
export function getTenantSupabaseClient(tenantId: string, clerkToken?: string | null): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        ...(clerkToken ? { Authorization: `Bearer ${clerkToken}` } : {}),
        "x-tenant-id": tenantId,
      },
    },
  });
}

