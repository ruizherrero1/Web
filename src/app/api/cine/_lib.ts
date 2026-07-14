import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { ProviderKey } from "@/app/apps/cine/_lib/types";

export type CineProfile = {
  id: string;
  initials: "RR" | "LB";
  display_name: string;
};

export const providerTmdbIds: Record<ProviderKey, number> = {
  netflix: 8,
  prime: 119,
  movistar: 149,
  max: 1899,
  disney: 337,
};


export function getCineAccessCookie() {
  return "cine_access";
}

// Access cookie lifetime. Long enough not to nag RR/LB, but the token now
// expires (the previous cookie was a static hash valid forever).
export const cineAccessMaxAgeSeconds = 60 * 60 * 24 * 180;

function getCineCookieSecret() {
  // Falls back to the shared password only so the gate keeps working if the
  // secret env var is missing; CINE_COOKIE_SECRET should always be set.
  return process.env.CINE_COOKIE_SECRET ?? process.env.CINE_SHARED_PASSWORD ?? "";
}

// HMAC-signed token with an expiry: `${expiresAtMs}.${hmac(expiresAtMs)}`.
export function makeCineAccessToken() {
  const secret = getCineCookieSecret();
  const expiresAt = Date.now() + cineAccessMaxAgeSeconds * 1000;
  const signature = createHmac("sha256", secret).update(String(expiresAt)).digest("hex");
  return `${expiresAt}.${signature}`;
}

export function hasCineAccess(request: Request) {
  const secret = getCineCookieSecret();
  if (!secret) return false;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((parts): parts is [string, string] => parts.length === 2)
  );

  const token = cookies[getCineAccessCookie()];
  if (!token) return false;
  const [rawExpires, signature] = token.split(".");
  const expiresAt = Number(rawExpires);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !signature) return false;

  const expected = createHmac("sha256", secret).update(rawExpires).digest("hex");
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"));
}
export const providerNames: Record<ProviderKey, string> = {
  netflix: "Netflix",
  prime: "Prime Video",
  movistar: "Movistar Plus+",
  max: "Max",
  disney: "Disney+",
};

export function getRequestToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/i);
  return match?.[1] ?? null;
}

export function getSupabaseForToken(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase is not configured.");
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

// Server-only client that bypasses RLS. Used by the cron route, which has no user session.
// SUPABASE_SERVICE_ROLE_KEY must never be exposed to the browser.
export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase service role is not configured.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireCineProfile(request: Request) {
  if (!hasCineAccess(request)) {
    return { error: Response.json({ error: "Cine password required" }, { status: 401 }) };
  }

  const token = getRequestToken(request);
  if (!token) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = getSupabaseForToken(token);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("cine_profiles")
    .select("id, initials, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase, profile: profile as CineProfile };
}

export function getTmdbAuth(): { headers: Record<string, string>; query: string } {
  const token = process.env.TMDB_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
      query: "",
    };
  }

  if (apiKey) {
    return {
      headers: {
        accept: "application/json",
      },
      query: `api_key=${encodeURIComponent(apiKey)}`,
    };
  }

  throw new Error("TMDB is not configured.");
}

export function appendQuery(url: string, query: string) {
  if (!query) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}
