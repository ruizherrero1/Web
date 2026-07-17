import { NextResponse } from "next/server";
import type { Availability, CineTitle, MediaKind, PendingCategory, ProfileKey, ProviderKey, WatchStatus } from "@/app/apps/cine/_lib/types";
import { requireCineProfile } from "../_lib";

type DbTitle = {
  id: string;
  tmdb_id: number;
  media_type: MediaKind;
  title: string;
  original_title: string | null;
  original_language: string | null;
  overview: string | null;
  poster_path: string;
  backdrop_path: string | null;
  release_year: number | null;
  runtime_label: string | null;
  genres: string[] | null;
  tmdb_vote: number | null;
  tmdb_popularity: number | null;
  imdb_id: string | null;
  imdb_rating: number | null;
  imdb_votes: number | null;
  metascore: number | null;
  rt_tomatometer: number | null;
  runtime_minutes: number | null;
  ratings_updated_at: string | null;
  created_at: string | null;
  last_synced_at: string | null;
  search_titles: string[] | null;
};

type DbAvailability = {
  title_id: string;
  provider_key: ProviderKey;
  monetization: Availability["type"];
};

type DbState = {
  title_id: string;
  status: WatchStatus;
  rating: number | null;
  watched_at: string | null;
  progress_season: number | null;
  progress_episode: number | null;
  cine_profiles?: { initials: ProfileKey } | null;
};

type DbPending = {
  title_id: string;
  cine_pending_categories?: { name: PendingCategory } | null;
  cine_profiles?: { initials: ProfileKey } | null;
};

export const dynamic = "force-dynamic";

const pageSize = 1000;
const titleSelect = "id, tmdb_id, media_type, title, original_title, original_language, overview, poster_path, backdrop_path, release_year, runtime_label, genres, tmdb_vote, tmdb_popularity, imdb_id, imdb_rating, imdb_votes, metascore, rt_tomatometer, runtime_minutes, ratings_updated_at, created_at, last_synced_at, search_titles";

export async function GET(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  try {
    // Legacy cine_user_marks are copied into cine_user_title_states by the sync
    // (migrateLegacyMarks), so the catalog no longer reads that table on every load.
    const [titles, availability, states, pending] = await Promise.all([
      fetchAll<DbTitle>(() => auth.supabase.from("cine_titles").select(titleSelect).eq("hidden", false).order("tmdb_popularity", { ascending: false })),
      fetchAll<DbAvailability>(() => auth.supabase.from("cine_availability").select("title_id, provider_key, monetization").eq("region", "ES")),
      fetchAll<DbState>(() => auth.supabase.from("cine_user_title_states").select("title_id, status, rating, watched_at, progress_season, progress_episode, cine_profiles(initials)")),
      fetchAll<DbPending>(() => auth.supabase.from("cine_pending_items").select("title_id, cine_pending_categories(name), cine_profiles(initials)")),
    ]);

    const lastSyncedAt = titles.reduce<string | null>(
      (latest, title) => (title.last_synced_at && (!latest || title.last_synced_at > latest) ? title.last_synced_at : latest),
      null
    );

    return NextResponse.json({
      titles: mapTitles(titles, availability, states, pending),
      lastSyncedAt,
      attribution: "Source: TMDB. Streaming availability data is powered by TMDB/JustWatch.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load Cine catalog." },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder type is not worth threading through here.
async function fetchAll<T>(createQuery: () => any): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await createQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function mapTitles(
  titles: DbTitle[],
  availability: DbAvailability[],
  states: DbState[],
  pending: DbPending[]
): CineTitle[] {
  const availabilityByTitle = groupBy(availability, (item) => item.title_id);
  const statesByTitle = groupBy(states, (item) => item.title_id);
  const pendingByTitle = groupBy(pending, (item) => item.title_id);

  return titles.map((title) => {
    const titleStates = statesByTitle.get(title.id) ?? [];
    const pendingItems = pendingByTitle.get(title.id) ?? [];

    return {
      id: title.id,
      tmdbId: title.tmdb_id,
      title: cleanText(title.title),
      originalTitle: cleanText(title.original_title ?? undefined),
      originalLanguage: title.original_language ?? undefined,
      searchTitles: unique([...(title.search_titles ?? []), title.original_title ?? ""].map(cleanText).filter(Boolean)),
      kind: title.media_type,
      year: title.release_year ?? 0,
      runtimeLabel: title.runtime_label ?? (title.media_type === "movie" ? "Pelicula" : "Serie"),
      genres: (title.genres ?? []).map(cleanText),
      posterPath: title.poster_path,
      backdropPath: title.backdrop_path ?? "",
      // Trimmed for payload size: the hero clamps to 3 lines and the detail
      // sheet fetches the full overview from TMDB. With 5000+ titles the full
      // texts would dominate the catalog response.
      overview: truncate(cleanText(title.overview ?? ""), 300),
      runtimeMinutes: title.runtime_minutes ?? undefined,
      imdbId: title.imdb_id ?? undefined,
      tmdbRating: Number(title.tmdb_vote ?? 0) || undefined,
      imdbRating: Number(title.imdb_rating ?? 0) || undefined,
      imdbVotes: title.imdb_votes ?? undefined,
      metascore: title.metascore ?? undefined,
      rtTomatometer: title.rt_tomatometer ?? undefined,
      ratingsUpdatedAt: title.ratings_updated_at ?? undefined,
      addedAt: title.created_at ?? undefined,
      tmdbPopularity: Number(title.tmdb_popularity ?? 0),
      availability: (availabilityByTitle.get(title.id) ?? []).map((item) => ({
        provider: item.provider_key,
        type: item.monetization,
      })),
      pendingCategories: unique(
        pendingItems.map((item) => item.cine_pending_categories?.name).filter(Boolean) as PendingCategory[]
      ),
      addedBy: pendingItems.find((item) => item.cine_profiles?.initials)?.cine_profiles?.initials,
      personal: {
        RR: resolvePersonalState(titleStates, "RR"),
        LB: resolvePersonalState(titleStates, "LB"),
      },
    };
  });
}

function resolvePersonalState(states: DbState[], profile: ProfileKey) {
  const source = states.find((item) => item.cine_profiles?.initials === profile);
  return {
    status: source?.status ?? "none",
    rating: source?.rating ?? undefined,
    watchedAt: source?.watched_at ?? undefined,
    season: source?.progress_season ?? undefined,
    episode: source?.progress_episode ?? undefined,
  };
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return grouped;
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}...`;
}

function cleanText(value?: string) {
  if (!value) return value ?? "";
  if (!/[\u00c3\u00c2]/.test(value)) return value;

  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}