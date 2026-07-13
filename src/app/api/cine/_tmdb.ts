import type { Availability, MediaKind, ProviderKey } from "@/app/apps/cine/_lib/types";
import { appendQuery, getTmdbAuth, providerTmdbIds } from "./_lib";

type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
};

export type TmdbCatalogTitle = {
  tmdb_id: number;
  media_type: MediaKind;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_year: number | null;
  runtime_label: string;
  genres: string[];
  tmdb_vote: number | null;
  tmdb_popularity: number;
  last_synced_at: string;
  availability: Availability[];
};

const movieGenres = new Map<number, string>();
const tvGenres = new Map<number, string>();

export async function loadTmdbCatalogForSync(pagesPerProvider: number) {
  await loadGenres();

  const syncedAt = new Date().toISOString();
  const deduped = new Map<string, TmdbCatalogTitle>();
  let requestedPages = 0;

  for (const [provider, tmdbProviderId] of Object.entries(providerTmdbIds) as Array<[ProviderKey, number]>) {
    for (const mediaType of ["movie", "series"] as const) {
      const endpointType = mediaType === "movie" ? "movie" : "tv";
      for (let page = 1; page <= pagesPerProvider; page += 1) {
        requestedPages += 1;
        const results = await tmdbDiscover(endpointType, tmdbProviderId, page);
        if (results.length === 0) break;
        for (const item of results) {
          if (!item.poster_path) continue;
          const title = mapTmdbItem(item, mediaType, provider, syncedAt);
          const key = `${title.media_type}-${title.tmdb_id}`;
          const existing = deduped.get(key);
          if (existing) {
            existing.availability = mergeAvailability(existing.availability, title.availability[0]);
            existing.tmdb_popularity = Math.max(existing.tmdb_popularity, title.tmdb_popularity);
          } else {
            deduped.set(key, title);
          }
        }
      }
    }
  }

  return { titles: [...deduped.values()], requestedPages, syncedAt };
}

async function tmdbDiscover(endpointType: "movie" | "tv", providerId: number, page: number): Promise<TmdbItem[]> {
  const auth = getTmdbAuth();
  const params = new URLSearchParams({
    language: "es-ES",
    watch_region: "ES",
    with_watch_providers: String(providerId),
    with_watch_monetization_types: "flatrate",
    include_adult: "false",
    sort_by: "popularity.desc",
    page: String(page),
  });
  const url = appendQuery(`https://api.themoviedb.org/3/discover/${endpointType}?${params.toString()}`, auth.query);
  const response = await fetch(url, { headers: auth.headers, cache: "no-store" });
  if (!response.ok) throw new Error(`TMDB discover failed: ${response.status}`);
  const payload = (await response.json()) as { results?: TmdbItem[] };
  return payload.results ?? [];
}

async function loadGenres() {
  if (movieGenres.size && tvGenres.size) return;
  const auth = getTmdbAuth();
  await Promise.all([
    loadGenreList("movie", movieGenres, auth),
    loadGenreList("tv", tvGenres, auth),
  ]);
}

async function loadGenreList(
  endpointType: "movie" | "tv",
  target: Map<number, string>,
  auth: ReturnType<typeof getTmdbAuth>
) {
  const url = appendQuery(`https://api.themoviedb.org/3/genre/${endpointType}/list?language=es-ES`, auth.query);
  const response = await fetch(url, { headers: auth.headers, next: { revalidate: 60 * 60 * 24 * 7 } });
  if (!response.ok) return;
  const payload = (await response.json()) as { genres?: Array<{ id: number; name: string }> };
  for (const genre of payload.genres ?? []) target.set(genre.id, genre.name);
}

function mapTmdbItem(
  item: TmdbItem,
  mediaType: MediaKind,
  provider: ProviderKey,
  syncedAt: string
): TmdbCatalogTitle {
  const genreMap = mediaType === "movie" ? movieGenres : tvGenres;
  const yearSource = mediaType === "movie" ? item.release_date : item.first_air_date;

  return {
    tmdb_id: item.id,
    media_type: mediaType,
    title: item.title ?? item.name ?? "Sin titulo",
    original_title: item.original_title ?? item.original_name,
    overview: item.overview ?? "",
    poster_path: item.poster_path ?? "",
    backdrop_path: item.backdrop_path ?? "",
    release_year: yearSource ? Number(yearSource.slice(0, 4)) : null,
    runtime_label: mediaType === "movie" ? "Pelicula" : "Serie",
    genres: (item.genre_ids ?? []).map((id) => genreMap.get(id)).filter(Boolean) as string[],
    tmdb_vote: item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
    tmdb_popularity: item.popularity ?? 0,
    last_synced_at: syncedAt,
    availability: [{ provider, type: "included" }],
  };
}

function mergeAvailability(items: Availability[], next: Availability) {
  if (items.some((item) => item.provider === next.provider && item.type === next.type)) return items;
  return [...items, next];
}