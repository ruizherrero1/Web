import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseEnv() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase env vars are not configured.");
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
