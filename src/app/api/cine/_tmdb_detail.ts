import type { MediaKind, ProviderKey, TitleCredit, TitleDetail } from "@/app/apps/cine/_lib/types";
import { appendQuery, getTmdbAuth, providerTmdbIds } from "./_lib";

// Per-title detail (cast, trailer, providers, runtime) for the detail sheet.
// Shared across users, so responses are cached daily via Next fetch revalidation.

const tmdbIdToProvider = new Map<number, ProviderKey>(
  (Object.entries(providerTmdbIds) as Array<[ProviderKey, number]>).map(([key, id]) => [id, key])
);

type TmdbVideo = { key?: string; site?: string; type?: string; official?: boolean };

type TmdbDetailResponse = {
  title?: string;
  name?: string;
  tagline?: string;
  overview?: string;
  runtime?: number | null;
  episode_run_time?: number[];
  genres?: Array<{ name: string }>;
  credits?: {
    cast?: Array<{ name?: string; character?: string; profile_path?: string | null }>;
    crew?: Array<{ name?: string; job?: string }>;
  };
  created_by?: Array<{ name?: string }>;
  videos?: { results?: TmdbVideo[] };
  "watch/providers"?: {
    results?: Record<string, { link?: string; flatrate?: Array<{ provider_id: number }> }>;
  };
};

export async function loadTmdbTitleDetail(tmdbId: number, kind: MediaKind): Promise<TitleDetail> {
  const endpoint = kind === "movie" ? "movie" : "tv";
  const auth = getTmdbAuth();
  const url = appendQuery(
    `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?language=es-ES&append_to_response=credits,videos,watch/providers`,
    auth.query
  );

  const response = await fetch(url, { headers: auth.headers, next: { revalidate: 60 * 60 * 24 } });
  if (!response.ok) throw new Error(`TMDB detail failed: ${response.status}`);
  const payload = (await response.json()) as TmdbDetailResponse;

  const runtime = kind === "movie" ? payload.runtime ?? undefined : payload.episode_run_time?.[0] ?? undefined;

  const cast: TitleCredit[] = (payload.credits?.cast ?? []).slice(0, 10).map((person) => ({
    name: person.name ?? "",
    character: person.character || undefined,
    profilePath: person.profile_path ?? undefined,
  })).filter((person) => person.name);

  const directors =
    kind === "movie"
      ? unique((payload.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name ?? "").filter(Boolean))
      : unique((payload.created_by ?? []).map((c) => c.name ?? "").filter(Boolean));

  const esProviders = payload["watch/providers"]?.results?.ES;
  const flatrateProviders = unique(
    (esProviders?.flatrate ?? [])
      .map((item) => tmdbIdToProvider.get(item.provider_id))
      .filter((key): key is ProviderKey => Boolean(key))
  );

  let trailerKey = pickTrailer(payload.videos?.results);
  // es-ES videos are often empty; fall back to en-US only when we found nothing.
  if (!trailerKey) trailerKey = await loadTrailerFallback(endpoint, tmdbId, auth);

  return {
    tmdbId,
    kind,
    title: payload.title ?? payload.name ?? "",
    tagline: payload.tagline || undefined,
    overview: payload.overview ?? "",
    runtimeMinutes: runtime && runtime > 0 ? runtime : undefined,
    genres: (payload.genres ?? []).map((genre) => genre.name).filter(Boolean),
    cast,
    directors,
    trailerKey,
    justwatchLink: esProviders?.link,
    flatrateProviders,
  };
}

async function loadTrailerFallback(
  endpoint: "movie" | "tv",
  tmdbId: number,
  auth: ReturnType<typeof getTmdbAuth>
): Promise<string | undefined> {
  const url = appendQuery(
    `https://api.themoviedb.org/3/${endpoint}/${tmdbId}/videos?language=en-US`,
    auth.query
  );
  const response = await fetch(url, { headers: auth.headers, next: { revalidate: 60 * 60 * 24 } });
  if (!response.ok) return undefined;
  const payload = (await response.json()) as { results?: TmdbVideo[] };
  return pickTrailer(payload.results);
}

function pickTrailer(videos?: TmdbVideo[]): string | undefined {
  const youtube = (videos ?? []).filter((video) => video.site === "YouTube" && video.key);
  const trailer =
    youtube.find((video) => video.type === "Trailer" && video.official) ??
    youtube.find((video) => video.type === "Trailer") ??
    youtube.find((video) => video.type === "Teaser") ??
    youtube[0];
  return trailer?.key;
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}
