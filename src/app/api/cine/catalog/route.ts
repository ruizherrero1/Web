import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Availability, CineTitle, MediaKind, ProfileKey, ProviderKey } from "@/app/apps/cine/_lib/types";
import { appendQuery, getTmdbAuth, providerTmdbIds, requireCineProfile } from "../_lib";

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

type CineMark = {
  user_id: string;
  tmdb_id: number;
  media_type: MediaKind;
  status: "none" | "watching" | "watched" | "abandoned";
  rating: number | null;
  watched_at: string | null;
  cine_profiles?: { initials: ProfileKey } | null;
};

const movieGenres = new Map<number, string>();
const tvGenres = new Map<number, string>();

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  try {
    const marks = await loadMarks(auth.supabase);
    const titles = await loadTmdbCatalog(marks);

    return NextResponse.json({
      titles,
      attribution: "Source: TMDB. Streaming availability data is powered by TMDB/JustWatch.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load Cine catalog." },
      { status: 500 }
    );
  }
}

async function loadMarks(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("cine_user_marks")
    .select("user_id, tmdb_id, media_type, status, rating, watched_at, cine_profiles(initials)");

  if (error) throw error;

  const marks = new Map<string, CineMark[]>();
  for (const mark of (data ?? []) as unknown as CineMark[]) {
    const key = `${mark.media_type}-${mark.tmdb_id}`;
    marks.set(key, [...(marks.get(key) ?? []), mark]);
  }
  return marks;
}

async function loadTmdbCatalog(marks: Map<string, CineMark[]>) {
  await loadGenres();

  const pagesPerProvider = Number(process.env.CINE_TMDB_PAGES_PER_PROVIDER ?? 4);
  const deduped = new Map<string, CineTitle>();

  for (const [provider, tmdbProviderId] of Object.entries(providerTmdbIds) as Array<[ProviderKey, number]>) {
    for (const mediaType of ["movie", "series"] as const) {
      const endpointType = mediaType === "movie" ? "movie" : "tv";
      for (let page = 1; page <= pagesPerProvider; page += 1) {
        const results = await tmdbDiscover(endpointType, tmdbProviderId, page);
        for (const item of results) {
          if (!item.poster_path) continue;
          const title = mapTmdbItem(item, mediaType, provider, marks);
          const existing = deduped.get(title.id);
          if (existing) {
            existing.availability = mergeAvailability(existing.availability, title.availability[0]);
          } else {
            deduped.set(title.id, title);
          }
        }
      }
    }
  }

  return [...deduped.values()].sort((left, right) => right.tmdbPopularity - left.tmdbPopularity);
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
  const response = await fetch(url, { headers: auth.headers, next: { revalidate: 60 * 60 * 12 } });
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
  marks: Map<string, CineMark[]>
): CineTitle {
  const key = `${mediaType}-${item.id}`;
  const titleMarks = marks.get(key) ?? [];
  const rr = titleMarks.find((mark) => mark.cine_profiles?.initials === "RR");
  const lb = titleMarks.find((mark) => mark.cine_profiles?.initials === "LB");
  const genreMap = mediaType === "movie" ? movieGenres : tvGenres;
  const yearSource = mediaType === "movie" ? item.release_date : item.first_air_date;

  return {
    id: key,
    tmdbId: item.id,
    title: item.title ?? item.name ?? "Sin titulo",
    originalTitle: item.original_title ?? item.original_name,
    kind: mediaType,
    year: yearSource ? Number(yearSource.slice(0, 4)) : 0,
    runtimeLabel: mediaType === "movie" ? "Pelicula" : "Serie",
    genres: (item.genre_ids ?? []).map((id) => genreMap.get(id)).filter(Boolean) as string[],
    posterPath: item.poster_path ?? "",
    backdropPath: item.backdrop_path ?? "",
    overview: item.overview ?? "",
    imdbRating: item.vote_average ? Number(item.vote_average.toFixed(1)) : undefined,
    tmdbPopularity: item.popularity ?? 0,
    availability: [{ provider, type: "included" }],
    pendingCategories: [],
    personal: {
      RR: {
        status: rr?.status ?? "none",
        rating: rr?.rating ?? undefined,
        watchedAt: rr?.watched_at ?? undefined,
      },
      LB: {
        status: lb?.status ?? "none",
        rating: lb?.rating ?? undefined,
        watchedAt: lb?.watched_at ?? undefined,
      },
    },
  };
}

function mergeAvailability(items: Availability[], next: Availability) {
  if (items.some((item) => item.provider === next.provider && item.type === next.type)) return items;
  return [...items, next];
}

