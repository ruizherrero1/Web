import type { MediaKind } from "@/app/apps/cine/_lib/types";

// OMDb returns IMDb, Rotten Tomatoes (critics) and Metacritic in a single call,
// plus runtime and the stable IMDb id. We use it as our multi-source ratings feed.
// Free tier is 1000 requests/day, so the sync enriches titles incrementally
// (stalest first) instead of hitting the whole catalog at once.

export type OmdbRatings = {
  imdbId?: string;
  imdbRating: number | null;
  imdbVotes: number | null;
  rtTomatometer: number | null;
  metascore: number | null;
  runtimeMinutes: number | null;
};

type OmdbRatingEntry = { Source?: string; Value?: string };

type OmdbResponse = {
  Response?: string;
  Error?: string;
  imdbID?: string;
  imdbRating?: string;
  imdbVotes?: string;
  Metascore?: string;
  Runtime?: string;
  Ratings?: OmdbRatingEntry[];
};

export function hasOmdbEnv() {
  return Boolean(process.env.OMDB_API_KEY);
}

export type OmdbLookup = {
  title: string;
  year?: number | null;
  kind: MediaKind;
  imdbId?: string | null;
};

export async function fetchOmdbRatings(lookup: OmdbLookup): Promise<OmdbRatings | null> {
  const key = process.env.OMDB_API_KEY;
  if (!key) throw new Error("OMDb API is not configured.");

  const params = new URLSearchParams({ apikey: key, r: "json" });
  if (lookup.imdbId) {
    params.set("i", lookup.imdbId);
  } else {
    params.set("t", lookup.title);
    params.set("type", lookup.kind === "series" ? "series" : "movie");
    if (lookup.year) params.set("y", String(lookup.year));
  }

  const response = await fetch(`https://www.omdbapi.com/?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`OMDb request failed: ${response.status}`);

  const payload = (await response.json()) as OmdbResponse;
  if (payload.Response === "False") return null;

  const rt = (payload.Ratings ?? []).find((entry) => entry.Source === "Rotten Tomatoes");

  return {
    imdbId: payload.imdbID || undefined,
    imdbRating: parseDecimal(payload.imdbRating),
    imdbVotes: parseInteger(payload.imdbVotes),
    rtTomatometer: parsePercent(rt?.Value),
    metascore: parsePercent(payload.Metascore),
    runtimeMinutes: parseRuntime(payload.Runtime),
  };
}

function parseDecimal(value?: string) {
  if (!value || value === "N/A") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(1)) : null;
}

function parseInteger(value?: string) {
  if (!value || value === "N/A") return null;
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePercent(value?: string) {
  if (!value || value === "N/A") return null;
  const match = value.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Math.round(Number(match[0]));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null;
}

function parseRuntime(value?: string) {
  if (!value || value === "N/A") return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
