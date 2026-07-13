import { NextResponse } from "next/server";
import type { Availability, CineTitle, MediaKind, PendingCategory, ProfileKey, ProviderKey, WatchStatus } from "@/app/apps/cine/_lib/types";
import { requireCineProfile } from "../_lib";

type DbTitle = {
  id: string;
  tmdb_id: number;
  media_type: MediaKind;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string;
  backdrop_path: string | null;
  release_year: number | null;
  runtime_label: string | null;
  genres: string[] | null;
  tmdb_vote: number | null;
  tmdb_popularity: number | null;
  imdb_rating: number | null;
  imdb_votes: number | null;
  rt_tomatometer: number | null;
  rt_popcornmeter: number | null;
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
  cine_profiles?: { initials: ProfileKey } | null;
};

type LegacyMark = {
  tmdb_id: number;
  media_type: MediaKind;
  status: WatchStatus;
  rating: number | null;
  watched_at: string | null;
  cine_profiles?: { initials: ProfileKey } | null;
};

type DbPending = {
  title_id: string;
  cine_pending_categories?: { name: PendingCategory } | null;
  cine_profiles?: { initials: ProfileKey } | null;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  try {
    const { data: titles, error: titlesError } = await auth.supabase
      .from("cine_titles")
      .select(
        "id, tmdb_id, media_type, title, original_title, overview, poster_path, backdrop_path, release_year, runtime_label, genres, tmdb_vote, tmdb_popularity, imdb_rating, imdb_votes, rt_tomatometer, rt_popcornmeter"
      )
      .order("tmdb_popularity", { ascending: false })
      .limit(2500);

    if (titlesError) throw titlesError;

    const [availabilityResult, statesResult, legacyMarksResult, pendingResult] = await Promise.all([
      auth.supabase.from("cine_availability").select("title_id, provider_key, monetization").eq("region", "ES"),
      auth.supabase.from("cine_user_title_states").select("title_id, status, rating, watched_at, cine_profiles(initials)"),
      auth.supabase.from("cine_user_marks").select("tmdb_id, media_type, status, rating, watched_at, cine_profiles(initials)"),
      auth.supabase.from("cine_pending_items").select("title_id, cine_pending_categories(name), cine_profiles(initials)"),
    ]);

    if (availabilityResult.error) throw availabilityResult.error;
    if (statesResult.error) throw statesResult.error;
    if (legacyMarksResult.error) throw legacyMarksResult.error;
    if (pendingResult.error) throw pendingResult.error;

    return NextResponse.json({
      titles: mapTitles(
        (titles ?? []) as DbTitle[],
        (availabilityResult.data ?? []) as unknown as DbAvailability[],
        (statesResult.data ?? []) as unknown as DbState[],
        (legacyMarksResult.data ?? []) as unknown as LegacyMark[],
        (pendingResult.data ?? []) as unknown as DbPending[]
      ),
      attribution: "Source: TMDB. Streaming availability data is powered by TMDB/JustWatch.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load Cine catalog." },
      { status: 500 }
    );
  }
}

function mapTitles(
  titles: DbTitle[],
  availability: DbAvailability[],
  states: DbState[],
  legacyMarks: LegacyMark[],
  pending: DbPending[]
): CineTitle[] {
  const availabilityByTitle = groupBy(availability, (item) => item.title_id);
  const statesByTitle = groupBy(states, (item) => item.title_id);
  const pendingByTitle = groupBy(pending, (item) => item.title_id);
  const legacyByTmdb = groupBy(legacyMarks, (item) => `${item.media_type}-${item.tmdb_id}`);

  return titles.map((title) => {
    const titleStates = statesByTitle.get(title.id) ?? [];
    const legacyStates = legacyByTmdb.get(`${title.media_type}-${title.tmdb_id}`) ?? [];
    const pendingItems = pendingByTitle.get(title.id) ?? [];

    return {
      id: title.id,
      tmdbId: title.tmdb_id,
      title: title.title,
      originalTitle: title.original_title ?? undefined,
      kind: title.media_type,
      year: title.release_year ?? 0,
      runtimeLabel: title.runtime_label ?? (title.media_type === "movie" ? "Pelicula" : "Serie"),
      genres: title.genres ?? [],
      posterPath: title.poster_path,
      backdropPath: title.backdrop_path ?? "",
      overview: title.overview ?? "",
      imdbRating: Number(title.imdb_rating ?? title.tmdb_vote ?? 0) || undefined,
      imdbVotes: title.imdb_votes ?? undefined,
      rtTomatometer: title.rt_tomatometer ?? undefined,
      rtPopcornmeter: title.rt_popcornmeter ?? undefined,
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
        RR: resolvePersonalState(titleStates, legacyStates, "RR"),
        LB: resolvePersonalState(titleStates, legacyStates, "LB"),
      },
    };
  });
}

function resolvePersonalState(states: DbState[], legacyMarks: LegacyMark[], profile: ProfileKey) {
  const state = states.find((item) => item.cine_profiles?.initials === profile);
  const legacy = legacyMarks.find((item) => item.cine_profiles?.initials === profile);
  const source = state ?? legacy;
  return {
    status: source?.status ?? "none",
    rating: source?.rating ?? undefined,
    watchedAt: source?.watched_at ?? undefined,
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