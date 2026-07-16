import { NextResponse } from "next/server";
import type { MediaKind } from "@/app/apps/cine/_lib/types";
import { requireCineProfile } from "../_lib";

// Hides a title for both users, permanently: the catalog filters hidden rows
// out and the importer's upsert never resets the flag (it only writes the
// columns it sends). Uses the existing update grant/policy on cine_titles.
export async function POST(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  const payload = (await request.json()) as { tmdbId: number; mediaType: MediaKind };
  if (!payload.tmdbId || !payload.mediaType) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from("cine_titles")
    .update({ hidden: true, updated_at: new Date().toISOString() })
    .eq("tmdb_id", payload.tmdbId)
    .eq("media_type", payload.mediaType);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
