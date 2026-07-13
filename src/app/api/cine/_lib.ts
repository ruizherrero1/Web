import { createHash } from "crypto";
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

export function makeCineAccessCookie(password: string) {
  const secret = process.env.CINE_COOKIE_SECRET ?? password;
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

export function hasCineAccess(request: Request) {
  const password = process.env.CINE_SHARED_PASSWORD;
  if (!password) return false;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((parts): parts is [string, string] => parts.length === 2)
  );
  return cookies[getCineAccessCookie()] === makeCineAccessCookie(password);
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
