import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchOmdbRatings, hasOmdbEnv } from "./_omdb";
import { loadTmdbCatalogForSync, type TmdbCatalogTitle } from "./_tmdb";

// Shared Cine catalog sync so both the user-triggered route (/api/cine/sync) and the
// scheduled cron route (/api/cine/cron/sync) run the exact same pipeline.

// 400-row chunks keep DB round-trips low enough for a 5000+ title import to fit
// in the serverless budget while staying under PostgREST payload limits.
const chunkSize = 400;

export type RatingsResult = { attempted: number; updated: number; skipped: boolean };

export type CatalogSyncResult = {
  titles: number;
  requestedPages: number;
  syncedAt: string;
  ratings: RatingsResult;
};

export function getPagesPerProvider() {
  const configured = Number(process.env.CINE_TMDB_PAGES_PER_PROVIDER ?? 20);
  return Number.isFinite(configured) ? Math.min(Math.max(configured, 1), 50) : 20;
}

// Full pipeline: import from TMDB, refresh availability, migrate legacy marks and enrich ratings.
export async function runCatalogSync(supabase: SupabaseClient): Promise<CatalogSyncResult> {
  const catalog = await loadTmdbCatalogForSync(getPagesPerProvider());
  const upserted = await upsertTitles(supabase, catalog.titles);
  await replaceAvailability(supabase, catalog.titles, upserted);
  await migrateLegacyMarks(supabase);
  const ratings = await enrichRatingsFromOmdb(supabase);

  return {
    titles: catalog.titles.length,
    requestedPages: catalog.requestedPages,
    syncedAt: catalog.syncedAt,
    ratings,
  };
}

// Lightweight pipeline: only enrich a batch of ratings (for a frequent cron that must stay fast).
export async function runRatingsSync(supabase: SupabaseClient): Promise<{ ratings: RatingsResult }> {
  return { ratings: await enrichRatingsFromOmdb(supabase) };
}

async function upsertTitles(supabase: SupabaseClient, titles: TmdbCatalogTitle[]) {
  const rows = titles.map(({ availability: _availability, ...title }) => ({
    ...title,
    updated_at: title.last_synced_at,
  }));
  const upserted = new Map<string, string>();

  for (const chunk of chunks(rows, chunkSize)) {
    const { data, error } = await supabase
      .from("cine_titles")
      .upsert(chunk, { onConflict: "tmdb_id,media_type" })
      .select("id, tmdb_id, media_type");

    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: string; tmdb_id: number; media_type: string }>) {
      upserted.set(`${row.media_type}-${row.tmdb_id}`, row.id);
    }
  }

  return upserted;
}

async function replaceAvailability(
  supabase: SupabaseClient,
  titles: TmdbCatalogTitle[],
  titleIdsByTmdb: Map<string, string>
) {
  const titleIds = [...titleIdsByTmdb.values()];
  for (const chunk of chunks(titleIds, chunkSize)) {
    const { error } = await supabase.from("cine_availability").delete().in("title_id", chunk).eq("region", "ES");
    if (error) throw error;
  }

  const rows = titles.flatMap((title) => {
    const titleId = titleIdsByTmdb.get(`${title.media_type}-${title.tmdb_id}`);
    if (!titleId) return [];
    return title.availability.map((item) => ({
      title_id: titleId,
      provider_key: item.provider,
      monetization: item.type,
      region: "ES",
      source: "tmdb_justwatch",
      updated_at: title.last_synced_at,
    }));
  });

  for (const chunk of chunks(rows, chunkSize)) {
    const { error } = await supabase.from("cine_availability").insert(chunk);
    if (error) throw error;
  }
}

type EnrichableTitle = {
  id: string;
  tmdb_id: number;
  media_type: "movie" | "series";
  title: string;
  original_title: string | null;
  release_year: number | null;
  imdb_id: string | null;
};

// Enrich the stalest titles with IMDb + Rotten Tomatoes + Metacritic + runtime from OMDb.
// Bounded per run (OMDb free tier is ~1000/day), so repeated syncs cover the catalog over time.
async function enrichRatingsFromOmdb(supabase: SupabaseClient): Promise<RatingsResult> {
  const configuredLimit = Number(process.env.CINE_OMDB_SYNC_LIMIT ?? 40);
  const limit = Number.isFinite(configuredLimit) ? Math.min(Math.max(configuredLimit, 0), 200) : 40;
  if (!hasOmdbEnv() || limit === 0) return { attempted: 0, updated: 0, skipped: true };

  const { data: titles, error } = await supabase
    .from("cine_titles")
    .select("id, tmdb_id, media_type, title, original_title, release_year, imdb_id")
    .order("ratings_updated_at", { ascending: true, nullsFirst: true })
    .order("tmdb_popularity", { ascending: false })
    .limit(limit);

  if (error) throw error;

  let attempted = 0;
  let updated = 0;
  const now = new Date().toISOString();
  const enrichConcurrency = 8;
  const list = (titles ?? []) as EnrichableTitle[];

  // Enrich in parallel waves: 150 sequential OMDb calls would eat the whole
  // 60s serverless budget on their own.
  for (let index = 0; index < list.length; index += enrichConcurrency) {
    const wave = list.slice(index, index + enrichConcurrency);
    await Promise.all(
      wave.map(async (title) => {
        attempted += 1;
        try {
          const ratings = await fetchOmdbRatings({
            title: title.title,
            year: title.release_year,
            kind: title.media_type,
            imdbId: title.imdb_id,
          });

          // Always stamp the freshness so a missing title rotates to the back of
          // the queue instead of being retried on every sync.
          const patch: Record<string, unknown> = { ratings_updated_at: now, updated_at: now };
          if (ratings) {
            if (ratings.imdbId) patch.imdb_id = ratings.imdbId;
            if (ratings.imdbRating !== null) patch.imdb_rating = ratings.imdbRating;
            if (ratings.imdbVotes !== null) patch.imdb_votes = ratings.imdbVotes;
            // Rotten Tomatoes is shown as a link to their site, not stored as a score.
            if (ratings.metascore !== null) patch.metascore = ratings.metascore;
            if (ratings.runtimeMinutes !== null) patch.runtime_minutes = ratings.runtimeMinutes;
          }

          const { error: updateError } = await supabase.from("cine_titles").update(patch).eq("id", title.id);
          if (updateError) throw updateError;
          if (ratings) updated += 1;
        } catch {
          // OMDb quota or a single-title miss should not block the catalog sync.
        }
      })
    );
  }

  return { attempted, updated, skipped: false };
}

async function migrateLegacyMarks(supabase: SupabaseClient) {
  const { data: marks, error: marksError } = await supabase
    .from("cine_user_marks")
    .select("user_id, tmdb_id, media_type, status, rating, watched_at, updated_at");
  if (marksError) throw marksError;
  if (!marks?.length) return;

  const { data: titles, error: titlesError } = await supabase.from("cine_titles").select("id, tmdb_id, media_type");
  if (titlesError) throw titlesError;

  const titleIds = new Map(
    ((titles ?? []) as Array<{ id: string; tmdb_id: number; media_type: string }>).map((title) => [
      `${title.media_type}-${title.tmdb_id}`,
      title.id,
    ])
  );

  const rows = ((marks ?? []) as Array<{
    user_id: string;
    tmdb_id: number;
    media_type: string;
    status: string;
    rating: number | null;
    watched_at: string | null;
    updated_at: string;
  }>).flatMap((mark) => {
    const titleId = titleIds.get(`${mark.media_type}-${mark.tmdb_id}`);
    if (!titleId) return [];
    return [{
      user_id: mark.user_id,
      title_id: titleId,
      status: mark.status,
      rating: mark.rating,
      watched_at: mark.watched_at,
      updated_at: mark.updated_at,
    }];
  });

  for (const chunk of chunks(rows, chunkSize)) {
    const { error } = await supabase.from("cine_user_title_states").upsert(chunk, { onConflict: "user_id,title_id" });
    if (error) throw error;
  }
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}
