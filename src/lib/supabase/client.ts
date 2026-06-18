import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// Singleton: una única instancia compartida por toda la app cliente. Así el
// login hecho en un componente propaga el evento onAuthStateChange a los demás,
// y la sesión persiste en localStorage (app puramente cliente, sin SSR auth).
let client: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
  return client;
}
