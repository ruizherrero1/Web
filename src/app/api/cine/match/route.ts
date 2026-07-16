import { NextResponse } from "next/server";
import type { MediaKind, ProfileKey } from "@/app/apps/cine/_lib/types";
import { requireCineProfile } from "../_lib";

export const dynamic = "force-dynamic";

type VoteRow = {
  title_id: string;
  liked: boolean;
  cine_profiles?: { initials: ProfileKey } | null;
};

// Both users can see each other's votes (it's a couple app; matches need it).
export async function GET(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("cine_match_votes")
    .select("title_id, liked, cine_profiles(initials)");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    votes: ((data ?? []) as unknown as VoteRow[]).map((row) => ({
      titleId: row.title_id,
      liked: row.liked,
      initials: row.cine_profiles?.initials ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  const payload = (await request.json()) as { tmdbId: number; mediaType: MediaKind; liked: boolean };
  if (!payload.tmdbId || !payload.mediaType || typeof payload.liked !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: title, error: titleError } = await auth.supabase
    .from("cine_titles")
    .select("id")
    .eq("tmdb_id", payload.tmdbId)
    .eq("media_type", payload.mediaType)
    .maybeSingle();
  if (titleError) return NextResponse.json({ error: titleError.message }, { status: 500 });
  if (!title) return NextResponse.json({ error: "Title is not imported yet." }, { status: 404 });

  // Upsert is safe here: the match_votes migration grants UPDATE with an
  // own-row policy (unlike cine_pending_items, which lacked it).
  const { error } = await auth.supabase.from("cine_match_votes").upsert(
    {
      user_id: auth.profile.id,
      title_id: title.id,
      liked: payload.liked,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,title_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
