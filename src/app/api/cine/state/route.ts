import { NextResponse } from "next/server";
import type { MediaKind, ProfileKey, WatchStatus } from "@/app/apps/cine/_lib/types";
import { requireCineProfile } from "../_lib";

type StatePayload = {
  tmdbId: number;
  mediaType: MediaKind;
  status?: WatchStatus;
  rating?: number | null;
  season?: number | null;
  episode?: number | null;
  scope?: "me" | "both";
};

type ExistingState = {
  user_id: string;
  status: WatchStatus;
  rating: number | null;
  watched_at: string | null;
  progress_season: number | null;
  progress_episode: number | null;
};

export async function POST(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  const payload = (await request.json()) as StatePayload;
  if (!payload.tmdbId || !payload.mediaType) {
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

  const targetInitials: ProfileKey[] = payload.scope === "both" ? ["RR", "LB"] : [auth.profile.initials];
  const { data: profiles, error: profileError } = await auth.supabase
    .from("cine_profiles")
    .select("id, initials")
    .in("initials", targetInitials);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const targetIds = (profiles ?? []).map((profile) => profile.id);
  const { data: existingStates, error: existingError } = await auth.supabase
    .from("cine_user_title_states")
    .select("user_id, status, rating, watched_at, progress_season, progress_episode")
    .eq("title_id", title.id)
    .in("user_id", targetIds);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const existingByUser = new Map((existingStates ?? []).map((state) => [state.user_id, state as ExistingState]));
  const hasRating = Object.prototype.hasOwnProperty.call(payload, "rating");
  const hasStatus = Object.prototype.hasOwnProperty.call(payload, "status");
  const hasProgress =
    Object.prototype.hasOwnProperty.call(payload, "season") ||
    Object.prototype.hasOwnProperty.call(payload, "episode");

  const upserts = (profiles ?? []).map((profile) => {
    const existing = existingByUser.get(profile.id);
    const isCurrentUser = profile.id === auth.profile.id;
    const nextStatus = hasStatus ? payload.status ?? "none" : existing?.status ?? "none";
    const nextRating = isCurrentUser && hasRating ? payload.rating ?? null : existing?.rating ?? null;
    // Series progress is personal: only the current user's row is updated.
    const nextSeason = isCurrentUser && hasProgress ? payload.season ?? null : existing?.progress_season ?? null;
    const nextEpisode = isCurrentUser && hasProgress ? payload.episode ?? null : existing?.progress_episode ?? null;

    return {
      user_id: profile.id,
      title_id: title.id,
      status: nextStatus,
      rating: nextRating,
      watched_at: nextStatus === "watched" ? existing?.watched_at ?? today : null,
      progress_season: nextSeason,
      progress_episode: nextEpisode,
      updated_at: now,
    };
  });

  const { error } = await auth.supabase.from("cine_user_title_states").upsert(upserts, {
    onConflict: "user_id,title_id",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}