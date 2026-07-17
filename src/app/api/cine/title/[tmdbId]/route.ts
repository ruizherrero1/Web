import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaKind } from "@/app/apps/cine/_lib/types";
import { fetchOmdbRatings, hasOmdbEnv } from "../../_omdb";
import { requireCineProfile } from "../../_lib";
import { loadTmdbTitleDetail } from "../../_tmdb_detail";

export type FreshRatings = {
  imdbRating: number | null;
  metascore: number | null;
};

export async function GET(request: Request, context: { params: Promise<{ tmdbId: string }> }) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  const { tmdbId: rawId } = await context.params;
  const tmdbId = Number(rawId);
  const type = new URL(request.url).searchParams.get("type");
  const kind: MediaKind = type === "series" ? "series" : "movie";

  if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "Invalid title id" }, { status: 400 });
  }

  try {
    const [detail, ratings] = await Promise.all([
      loadTmdbTitleDetail(tmdbId, kind),
      enrichOnDemand(auth.supabase, tmdbId, kind),
    ]);
    return NextResponse.json({ detail, ratings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load title detail." },
      { status: 500 }
    );
  }
}

// On-demand OMDb enrichment: the batch cron works most-popular-first, so tail
// titles can wait weeks for their IMDb rating. Opening a detail sheet fetches
// and persists the ratings for THAT title immediately — the user sees the real
// score at once and TMDB-inflated junk gets caught by the quality gate on the
// next catalog load.
async function enrichOnDemand(
  supabase: SupabaseClient,
  tmdbId: number,
  kind: MediaKind
): Promise<FreshRatings | null> {
  if (!hasOmdbEnv()) return null;

  try {
    const { data: row } = await supabase
      .from("cine_titles")
      .select("id, title, release_year, imdb_id, imdb_rating, metascore")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", kind)
      .maybeSingle();
    if (!row) return null;

    // Already enriched: return what we have without spending an OMDb call.
    if (row.imdb_rating !== null) {
      return { imdbRating: row.imdb_rating, metascore: row.metascore };
    }

    const ratings = await fetchOmdbRatings({
      title: row.title,
      year: row.release_year,
      kind,
      imdbId: row.imdb_id,
    });

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { ratings_updated_at: now, updated_at: now };
    if (ratings) {
      if (ratings.imdbId) patch.imdb_id = ratings.imdbId;
      if (ratings.imdbRating !== null) patch.imdb_rating = ratings.imdbRating;
      if (ratings.imdbVotes !== null) patch.imdb_votes = ratings.imdbVotes;
      if (ratings.metascore !== null) patch.metascore = ratings.metascore;
      if (ratings.runtimeMinutes !== null) patch.runtime_minutes = ratings.runtimeMinutes;
    }
    await supabase.from("cine_titles").update(patch).eq("id", row.id);

    return { imdbRating: ratings?.imdbRating ?? null, metascore: ratings?.metascore ?? null };
  } catch {
    // Ratings are a bonus on this route; never block the detail sheet.
    return null;
  }
}
