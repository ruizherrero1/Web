import { NextResponse } from "next/server";
import type { MediaKind, PendingCategory, ProviderKey } from "@/app/apps/cine/_lib/types";
import { appendQuery, getTmdbAuth, providerTmdbIds, requireCineProfile } from "../_lib";

// Manual title addition: search TMDB by name and import a specific title into
// the catalog — the escape hatch for "someone recommended X" when X is rent-only
// or fell outside the import filters. Added titles are pinned to a pending
// category so the client-side quality/noise filters never remove them.

export const dynamic = "force-dynamic";

type SearchResult = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
};

type TmdbDetail = {
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
  genres?: Array<{ name: string }>;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  "watch/providers"?: { results?: Record<string, { flatrate?: Array<{ provider_id: number }> }> };
};

const providerByTmdbId = new Map<number, ProviderKey>(
  (Object.entries(providerTmdbIds) as Array<[ProviderKey, number]>).map(([key, id]) => [id, key])
);

export async function POST(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  const payload = (await request.json()) as {
    action: "search" | "add";
    query?: string;
    tmdbId?: number;
    mediaType?: MediaKind;
    category?: PendingCategory;
  };

  try {
    if (payload.action === "search") {
      const query = (payload.query ?? "").trim();
      if (query.length < 2) return NextResponse.json({ error: "Query too short" }, { status: 400 });

      const tmdb = getTmdbAuth();
      const url = appendQuery(
        `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&language=es-ES&include_adult=false`,
        tmdb.query
      );
      const response = await fetch(url, { headers: tmdb.headers, cache: "no-store" });
      if (!response.ok) throw new Error(`TMDB search failed: ${response.status}`);
      const data = (await response.json()) as { results?: SearchResult[] };

      const results = (data.results ?? [])
        .filter((item) => (item.media_type === "movie" || item.media_type === "tv") && item.poster_path)
        .slice(0, 8)
        .map((item) => ({
          tmdbId: item.id,
          kind: (item.media_type === "tv" ? "series" : "movie") as MediaKind,
          title: item.title ?? item.name ?? "",
          year: Number((item.release_date ?? item.first_air_date ?? "").slice(0, 4)) || null,
          posterPath: item.poster_path ?? "",
          tmdbRating: item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
        }));

      return NextResponse.json({ results });
    }

    if (payload.action === "add") {
      if (!payload.tmdbId || !payload.mediaType || !payload.category) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }
      const endpoint = payload.mediaType === "movie" ? "movie" : "tv";
      const tmdb = getTmdbAuth();
      const [enRes, esRes] = await Promise.all([
        fetch(
          appendQuery(
            `https://api.themoviedb.org/3/${endpoint}/${payload.tmdbId}?language=en-US&append_to_response=watch/providers`,
            tmdb.query
          ),
          { headers: tmdb.headers, cache: "no-store" }
        ),
        fetch(appendQuery(`https://api.themoviedb.org/3/${endpoint}/${payload.tmdbId}?language=es-ES`, tmdb.query), {
          headers: tmdb.headers,
          cache: "no-store",
        }),
      ]);
      if (!enRes.ok) throw new Error(`TMDB detail failed: ${enRes.status}`);
      const en = (await enRes.json()) as TmdbDetail;
      const es = esRes.ok ? ((await esRes.json()) as TmdbDetail) : null;

      const englishTitle = en.title ?? en.name ?? en.original_title ?? en.original_name ?? "Untitled";
      const spanishTitle = es?.title ?? es?.name;
      const originalTitle = en.original_title ?? en.original_name;
      const yearSource = en.release_date ?? en.first_air_date;
      const now = new Date().toISOString();

      const row = {
        tmdb_id: en.id,
        media_type: payload.mediaType,
        title: englishTitle,
        original_title: spanishTitle && spanishTitle !== englishTitle ? spanishTitle : originalTitle ?? null,
        original_language: en.original_language ?? null,
        overview: es?.overview || en.overview || "",
        poster_path: en.poster_path ?? es?.poster_path ?? "",
        backdrop_path: en.backdrop_path ?? es?.backdrop_path ?? "",
        release_year: yearSource ? Number(yearSource.slice(0, 4)) : null,
        runtime_label: payload.mediaType === "movie" ? "Movie" : "Series",
        genres: (es?.genres ?? en.genres ?? []).map((genre) => genre.name).filter(Boolean),
        tmdb_vote: en.vote_average ? Number(en.vote_average.toFixed(1)) : null,
        tmdb_popularity: en.popularity ?? 0,
        imdb_votes: en.vote_count ?? null,
        search_titles: [...new Set([englishTitle, spanishTitle, originalTitle].filter(Boolean))] as string[],
        last_synced_at: now,
        updated_at: now,
      };

      const { data: upserted, error: upsertError } = await auth.supabase
        .from("cine_titles")
        .upsert(row, { onConflict: "tmdb_id,media_type" })
        .select("id")
        .maybeSingle();
      if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
      if (!upserted) return NextResponse.json({ error: "Could not save the title." }, { status: 500 });

      // Availability, if the title happens to be included somewhere.
      const flatrate = en["watch/providers"]?.results?.ES?.flatrate ?? [];
      const availabilityRows = flatrate
        .map((item) => providerByTmdbId.get(item.provider_id))
        .filter((key): key is ProviderKey => Boolean(key))
        .map((provider) => ({
          title_id: upserted.id,
          provider_key: provider,
          monetization: "included",
          region: "ES",
          source: "tmdb_justwatch",
          updated_at: now,
        }));
      if (availabilityRows.length) {
        await auth.supabase
          .from("cine_availability")
          .upsert(availabilityRows, { onConflict: "title_id,provider_key,monetization,region" });
      }

      // Pin it to the chosen pending category so the client filters keep it.
      const { data: category } = await auth.supabase
        .from("cine_pending_categories")
        .select("id")
        .eq("name", payload.category)
        .maybeSingle();
      if (category) {
        const { error: pendingError } = await auth.supabase.from("cine_pending_items").insert({
          title_id: upserted.id,
          category_id: category.id,
          added_by: auth.profile.id,
        });
        if (pendingError && pendingError.code !== "23505") {
          return NextResponse.json({ error: `Titulo anadido, pero no se pudo guardar en pendientes: ${pendingError.message}` }, { status: 500 });
        }
      }

      return NextResponse.json({ ok: true, availableOn: availabilityRows.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not add the title." },
      { status: 500 }
    );
  }
}
