import type { Availability, MediaKind, ProviderKey } from "@/app/apps/cine/_lib/types";
import { appendQuery, getTmdbAuth, providerTmdbIds } from "./_lib";

type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
};

export type TmdbCatalogTitle = {
  tmdb_id: number;
  media_type: MediaKind;
  title: string;
  original_title?: string;
  original_language: string | null;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_year: number | null;
  runtime_label: string;
  genres: string[];
  tmdb_vote: number | null;
  tmdb_popularity: number;
  imdb_votes: number | null;
  search_titles: string[];
  last_synced_at: string;
  availability: Availability[];
};

// Owner preference: the ES streaming listings are flooded with Asian-market
// content (Chinese/Korean/Indian dramas etc.) they will never watch. Titles in
// these original languages are only imported when they genuinely broke through
// in the West, using TMDB vote count (a mostly Western userbase) as the proxy —
// Parasite/Squid Game-tier survives, the filler does not.
const asianOriginalLanguages = new Set([
  "zh", "cn", "ko", "ja", "hi", "ta", "te", "ml", "kn", "bn", "mr", "pa", "gu",
  "ur", "th", "vi", "id", "ms", "tl", "fil", "km", "my", "lo", "si", "ne",
]);
const asianKeepMinVotes = 500;

function passesWesternFilter(item: TmdbItem) {
  if (!item.original_language || !asianOriginalLanguages.has(item.original_language)) return true;
  return (item.vote_count ?? 0) >= asianKeepMinVotes;
}

const movieGenres = new Map<number, string>();
const tvGenres = new Map<number, string>();

// Pages are fetched in parallel waves so a large import (40 pages x 5 providers
// x 2 types x 2 languages = 800 requests) fits comfortably inside the 60s
// serverless budget. TMDB tolerates ~40-50 req/s; waves of 8 page-pairs stay
// well under that.
const pageConcurrency = 8;

// English-only backfill: the western filter throws away the Asian portion of
// each page, so an extra pass restricted to with_original_language=en digs
// deeper into western content without wasting page slots.
function getEnglishBackfillPages() {
  const configured = Number(process.env.CINE_TMDB_EN_EXTRA_PAGES ?? 12);
  return Number.isFinite(configured) ? Math.min(Math.max(configured, 0), 25) : 12;
}

export async function loadTmdbCatalogForSync(pagesPerProvider: number) {
  await loadGenres();

  const syncedAt = new Date().toISOString();
  const deduped = new Map<string, TmdbCatalogTitle>();
  const counter = { requestedPages: 0 };
  const englishExtraPages = getEnglishBackfillPages();

  for (const [provider, tmdbProviderId] of Object.entries(providerTmdbIds) as Array<[ProviderKey, number]>) {
    for (const mediaType of ["movie", "series"] as const) {
      await importDiscoverPages(deduped, counter, provider, tmdbProviderId, mediaType, pagesPerProvider, syncedAt);
      if (englishExtraPages > 0) {
        await importDiscoverPages(deduped, counter, provider, tmdbProviderId, mediaType, englishExtraPages, syncedAt, "en");
      }
    }
  }

  return { titles: [...deduped.values()], requestedPages: counter.requestedPages, syncedAt };
}

async function importDiscoverPages(
  deduped: Map<string, TmdbCatalogTitle>,
  counter: { requestedPages: number },
  provider: ProviderKey,
  tmdbProviderId: number,
  mediaType: MediaKind,
  maxPages: number,
  syncedAt: string,
  originalLanguage?: string
) {
  const endpointType = mediaType === "movie" ? "movie" : "tv";
  let nextPage = 1;
  let exhausted = false;

  while (!exhausted && nextPage <= maxPages) {
    const wave: number[] = [];
    while (wave.length < pageConcurrency && nextPage <= maxPages) {
      wave.push(nextPage);
      nextPage += 1;
    }

    const results = await Promise.all(
      wave.map(async (page) => {
        const [englishResults, spanishResults] = await Promise.all([
          tmdbDiscover(endpointType, tmdbProviderId, page, "en-US", originalLanguage),
          tmdbDiscover(endpointType, tmdbProviderId, page, "es-ES", originalLanguage),
        ]);
        return { englishResults, spanishResults };
      })
    );
    counter.requestedPages += wave.length * 2;

    for (const { englishResults, spanishResults } of results) {
      if (englishResults.length === 0 && spanishResults.length === 0) {
        exhausted = true;
        continue;
      }

      const spanishById = new Map(spanishResults.map((item) => [item.id, item]));
      const allItems = new Map<number, TmdbItem>();
      for (const item of englishResults) allItems.set(item.id, item);
      for (const item of spanishResults) if (!allItems.has(item.id)) allItems.set(item.id, item);

      for (const item of allItems.values()) {
        if (!item.poster_path) continue;
        if (!passesWesternFilter(item)) continue;
        const title = mapTmdbItem(item, spanishById.get(item.id), mediaType, provider, syncedAt);
        const key = `${title.media_type}-${title.tmdb_id}`;
        const existing = deduped.get(key);
        if (existing) {
          existing.availability = mergeAvailability(existing.availability, title.availability[0]);
          existing.tmdb_popularity = Math.max(existing.tmdb_popularity, title.tmdb_popularity);
          existing.search_titles = unique([...existing.search_titles, ...title.search_titles]);
        } else {
          deduped.set(key, title);
        }
      }
    }
  }
}

async function tmdbDiscover(
  endpointType: "movie" | "tv",
  providerId: number,
  page: number,
  language: "en-US" | "es-ES",
  originalLanguage?: string
): Promise<TmdbItem[]> {
  const auth = getTmdbAuth();
  const params = new URLSearchParams({
    language,
    watch_region: "ES",
    with_watch_providers: String(providerId),
    with_watch_monetization_types: "flatrate",
    include_adult: "false",
    sort_by: "popularity.desc",
    page: String(page),
  });
  if (originalLanguage) params.set("with_original_language", originalLanguage);
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
  spanishItem: TmdbItem | undefined,
  mediaType: MediaKind,
  provider: ProviderKey,
  syncedAt: string
): TmdbCatalogTitle {
  const genreMap = mediaType === "movie" ? movieGenres : tvGenres;
  const yearSource = mediaType === "movie" ? item.release_date : item.first_air_date;
  const englishTitle = cleanTitle(item.title ?? item.name ?? item.original_title ?? item.original_name) ?? "Untitled";
  const spanishTitle = cleanTitle(spanishItem?.title ?? spanishItem?.name);
  const originalTitle = cleanTitle(item.original_title ?? item.original_name);
  const aliases = unique([englishTitle, spanishTitle, originalTitle].filter(Boolean) as string[]);

  return {
    tmdb_id: item.id,
    media_type: mediaType,
    title: englishTitle,
    original_title: spanishTitle && spanishTitle !== englishTitle ? spanishTitle : originalTitle,
    original_language: item.original_language ?? null,
    overview: cleanText(item.overview ?? spanishItem?.overview ?? ""),
    poster_path: item.poster_path ?? spanishItem?.poster_path ?? "",
    backdrop_path: item.backdrop_path ?? spanishItem?.backdrop_path ?? "",
    release_year: yearSource ? Number(yearSource.slice(0, 4)) : null,
    runtime_label: mediaType === "movie" ? "Movie" : "Series",
    genres: (item.genre_ids ?? []).map((id) => cleanText(genreMap.get(id))).filter(Boolean) as string[],
    tmdb_vote: item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
    tmdb_popularity: item.popularity ?? 0,
    imdb_votes: item.vote_count ?? null,
    search_titles: aliases,
    last_synced_at: syncedAt,
    availability: [{ provider, type: "included" }],
  };
}

function cleanTitle(value?: string) {
  const text = cleanText(value).trim();
  return text || undefined;
}

function cleanText(value?: string) {
  if (!value) return "";
  if (!/[\u00c3\u00c2]/.test(value)) return value;

  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}
function mergeAvailability(items: Availability[], next: Availability) {
  if (items.some((item) => item.provider === next.provider && item.type === next.type)) return items;
  return [...items, next];
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}
