import { NextResponse } from "next/server";
import type { MediaKind, ProfileKey, WatchStatus } from "@/app/apps/cine/_lib/types";
import { requireCineProfile } from "../_lib";

type StatePayload = {
  tmdbId: number;
  mediaType: MediaKind;
  status?: WatchStatus;
  rating?: number;
  scope?: "me" | "both";
};

type ExistingMark = {
  user_id: string;
  status: WatchStatus;
  rating: number | null;
  watched_at: string | null;
};

export async function POST(request: Request) {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  const payload = (await request.json()) as StatePayload;
  if (!payload.tmdbId || !payload.mediaType) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const targetInitials: ProfileKey[] = payload.scope === "both" ? ["RR", "LB"] : [auth.profile.initials];
  const { data: profiles, error: profileError } = await auth.supabase
    .from("cine_profiles")
    .select("id, initials")
    .in("initials", targetInitials);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const targetIds = (profiles ?? []).map((profile) => profile.id);
  const { data: existingMarks, error: existingError } = await auth.supabase
    .from("cine_user_marks")
    .select("user_id, status, rating, watched_at")
    .eq("tmdb_id", payload.tmdbId)
    .eq("media_type", payload.mediaType)
    .in("user_id", targetIds);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const existingByUser = new Map((existingMarks ?? []).map((mark) => [mark.user_id, mark as ExistingMark]));

  const upserts = (profiles ?? []).map((profile) => {
    const existing = existingByUser.get(profile.id);
    const isCurrentUser = profile.id === auth.profile.id;
    const nextStatus = payload.status ?? existing?.status ?? "none";

    return {
      user_id: profile.id,
      tmdb_id: payload.tmdbId,
      media_type: payload.mediaType,
      status: nextStatus,
      rating: isCurrentUser ? payload.rating ?? existing?.rating ?? null : existing?.rating ?? null,
      watched_at: nextStatus === "watched" ? existing?.watched_at ?? today : null,
      updated_at: now,
    };
  });

  const { error } = await auth.supabase.from("cine_user_marks").upsert(upserts, {
    onConflict: "user_id,tmdb_id,media_type",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
