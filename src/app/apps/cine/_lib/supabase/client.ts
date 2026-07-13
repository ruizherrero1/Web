import { createBrowserClient } from "@supabase/ssr";

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_CINE_SUPABASE_URL && process.env.NEXT_PUBLIC_CINE_SUPABASE_PUBLISHABLE_KEY);
}

export function createClient() {
  if (!process.env.NEXT_PUBLIC_CINE_SUPABASE_URL || !process.env.NEXT_PUBLIC_CINE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Supabase env vars are not configured.");
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_CINE_SUPABASE_URL,
    process.env.NEXT_PUBLIC_CINE_SUPABASE_PUBLISHABLE_KEY
  );
}

