import { NextResponse } from "next/server";
import type { MediaKind, PendingCategory } from "@/app/apps/cine/_lib/types";
import { requireCineProfile } from "../_lib";

type PendingPayload = {
  tmdbId: number;
  mediaType: MediaKind;
  category: PendingCategory;
};

export async function POST(request: Request) {
  return updatePending(request, "add");
}

export async function DELETE(request: Request) {
  return updatePending(request, "remove");
}

async function updatePending(request: Request, action: "add" | "remove") {
  const auth = await requireCineProfile(request);
  if ("error" in auth) return auth.error;

  const payload = (await request.json()) as PendingPayload;
  if (!payload.tmdbId || !payload.mediaType || !payload.category) {
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

  const { data: category, error: categoryError } = await auth.supabase
    .from("cine_pending_categories")
    .select("id")
    .eq("name", payload.category)
    .maybeSingle();
  if (categoryError) return NextResponse.json({ error: categoryError.message }, { status: 500 });
  if (!category) return NextResponse.json({ error: "Unknown pending category." }, { status: 404 });

  if (action === "add") {
    // Plain insert, NOT upsert: Postgres requires UPDATE privilege for
    // INSERT ... ON CONFLICT DO UPDATE even when no conflict happens, and the
    // grants/policies for cine_pending_items only allow insert/delete — the
    // upsert made every add fail with "permission denied". A duplicate key
    // (already in that category) is simply treated as success.
    const { error } = await auth.supabase.from("cine_pending_items").insert({
      title_id: title.id,
      category_id: category.id,
      added_by: auth.profile.id,
    });
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { error } = await auth.supabase
    .from("cine_pending_items")
    .delete()
    .eq("title_id", title.id)
    .eq("category_id", category.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}