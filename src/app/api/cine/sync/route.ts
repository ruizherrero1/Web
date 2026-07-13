import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireCineProfile } from "../_lib";
import { loadTmdbCatalogForSync, type TmdbCatalogTitle } from "../_tmdb";

export const dynamic = "force-dynamic";

const chunkSize = 100;

export async function POST(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  try {
    const configuredPages = Number(process.env.CINE_TMDB_PAGES_PER_PROVIDER ?? 8);
    const pagesPerProvider = Number.isFinite(configuredPages) ? Math.min(Math.max(configuredPages, 1), 25) : 8;
    const catalog = await loadTmdbCatalogForSync(pagesPerProvider);
    const upserted = await upsertTitles(auth.supabase, catalog.titles);
    await replaceAvailability(auth.supabase, catalog.titles, upserted);
    await migrateLegacyMarks(auth.supabase);

    return NextResponse.json({
      ok: true,
      titles: catalog.titles.length,
      requestedPages: catalog.requestedPages,
      syncedAt: catalog.syncedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync Cine catalog." },
      { status: 500 }
    );
  }
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